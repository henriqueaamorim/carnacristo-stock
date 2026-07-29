import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import { isPaymentMethod, parseOrderItems } from "@/lib/order-items";
import { requireAdmin } from "@/lib/require-admin";
import {
  buildOrderTitleIlikePattern,
  isOrderTitleSearchActive,
} from "@/utils/orderTitleSearch";
import { validateOrderTitle } from "@/utils/validation";

export async function GET(request: Request) {
  const g = await requireAdmin();
  if (!g.ok) return g.response;

  const u = new URL(request.url);
  const from = u.searchParams.get("from");
  const to = u.searchParams.get("to");
  const sellerId = u.searchParams.get("sellerId");
  const status = u.searchParams.get("status");
  const titleRaw = u.searchParams.get("title") ?? "";

  let q = g.supabase
    .from("orders")
    .select(
      "id, order_id_display, title, seller_id, payment_method, total_amount, status, created_at",
    )
    .order("created_at", { ascending: false });

  if (from) q = q.gte("created_at", from);
  if (to) q = q.lte("created_at", to);
  if (sellerId) q = q.eq("seller_id", sellerId);
  if (status && status !== "all") q = q.eq("status", status);
  if (isOrderTitleSearchActive(titleRaw)) {
    q = q.ilike("title", buildOrderTitleIlikePattern(titleRaw));
  }

  const { data: orders, error } = await q;

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const ids = [...new Set((orders ?? []).map((o) => o.seller_id))];
  const sellers: Record<
    string,
    { email: string | null; full_name: string | null }
  > = {};

  if (ids.length > 0) {
    const { data: profs } = await g.supabase
      .from("profiles")
      .select("id, email, full_name")
      .in("id", ids);
    for (const p of profs ?? []) {
      sellers[p.id] = { email: p.email, full_name: p.full_name };
    }
  }

  const pendingOrderIds = (orders ?? [])
    .filter((o) => o.status === "pending")
    .map((o) => o.id);
  const paidByOrder: Record<string, number> = {};

  if (pendingOrderIds.length > 0) {
    const { data: payments } = await g.supabase
      .from("order_payments")
      .select("order_id, amount")
      .in("order_id", pendingOrderIds);
    for (const p of payments ?? []) {
      paidByOrder[p.order_id] = (paidByOrder[p.order_id] ?? 0) + Number(p.amount);
    }
  }

  return NextResponse.json(
    (orders ?? []).map((o) => {
      const amountPaid = paidByOrder[o.id] ?? 0;
      return {
        ...o,
        seller: sellers[o.seller_id] ?? null,
        amountPaid,
        remainingBalance: Number(o.total_amount) - amountPaid,
      };
    }),
  );
}

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "JSON inválido" }, { status: 400 });
  }

  const title =
    typeof body === "object" && body !== null && "title" in body
      ? String((body as { title: unknown }).title)
      : "";
  const deferredPayment =
    typeof body === "object" &&
    body !== null &&
    "deferredPayment" in body &&
    (body as { deferredPayment: unknown }).deferredPayment === true;
  const paymentMethod =
    typeof body === "object" && body !== null && "paymentMethod" in body
      ? (body as { paymentMethod: unknown }).paymentMethod
      : null;
  const partialAmountRaw =
    typeof body === "object" && body !== null && "partialAmount" in body
      ? (body as { partialAmount: unknown }).partialAmount
      : null;
  const items =
    typeof body === "object" && body !== null && "items" in body
      ? (body as { items: unknown }).items
      : null;

  const hasPartialAmount = partialAmountRaw != null;

  if (deferredPayment && (paymentMethod != null || hasPartialAmount)) {
    return NextResponse.json(
      { error: "Não envie forma de pagamento em pedido pendente." },
      { status: 400 },
    );
  }

  if (!deferredPayment && !isPaymentMethod(paymentMethod)) {
    return NextResponse.json(
      { error: "Forma de pagamento inválida" },
      { status: 400 },
    );
  }

  let partialAmount: number | null = null;
  if (hasPartialAmount) {
    const n = Number(partialAmountRaw);
    if (!Number.isFinite(n) || n <= 0) {
      return NextResponse.json(
        { error: "Valor de pagamento inválido." },
        { status: 400 },
      );
    }
    partialAmount = n;
  }

  const parsed = parseOrderItems(items);
  if (!parsed.ok) return parsed.response;

  const titleResult = validateOrderTitle(title);
  if (!titleResult.ok) {
    return NextResponse.json({ error: titleResult.message }, { status: 400 });
  }

  const { data, error } = await supabase.rpc("create_order_with_inventory", {
    p_title: titleResult.value,
    p_payment_method: deferredPayment ? null : paymentMethod,
    p_items: parsed.items,
    p_partial_amount: partialAmount,
  });

  if (error) {
    const msg = error.message ?? "";
    if (msg.includes("Estoque insuficiente")) {
      return NextResponse.json({ error: msg }, { status: 409 });
    }
    if (msg.includes("invalid_title_min_length")) {
      return NextResponse.json(
        { error: "O título do pedido deve ter no mínimo 5 caracteres." },
        { status: 400 },
      );
    }
    if (msg.includes("invalid_title")) {
      return NextResponse.json(
        { error: "O campo título do pedido está vazio." },
        { status: 400 },
      );
    }
    if (msg.includes("payment_exceeds_balance")) {
      return NextResponse.json(
        { error: "Valor pago não pode ser maior que o total do pedido." },
        { status: 409 },
      );
    }
    if (msg.includes("invalid_payment_amount")) {
      return NextResponse.json(
        { error: "Valor de pagamento inválido." },
        { status: 400 },
      );
    }
    return NextResponse.json({ error: msg || "Erro ao criar pedido" }, { status: 400 });
  }

  return NextResponse.json(data, { status: 201 });
}
