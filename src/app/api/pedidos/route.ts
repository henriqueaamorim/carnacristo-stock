import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import { isPaymentMethod, parseOrderItems } from "@/lib/order-items";
import { requireAdmin } from "@/lib/require-admin";
import { validateOrderTitle } from "@/utils/validation";

export async function GET(request: Request) {
  const g = await requireAdmin();
  if (!g.ok) return g.response;

  const u = new URL(request.url);
  const from = u.searchParams.get("from");
  const to = u.searchParams.get("to");
  const sellerId = u.searchParams.get("sellerId");
  const status = u.searchParams.get("status");

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

  return NextResponse.json(
    (orders ?? []).map((o) => ({
      ...o,
      seller: sellers[o.seller_id] ?? null,
    })),
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
  const paymentMethod =
    typeof body === "object" && body !== null && "paymentMethod" in body
      ? (body as { paymentMethod: unknown }).paymentMethod
      : null;
  const items =
    typeof body === "object" && body !== null && "items" in body
      ? (body as { items: unknown }).items
      : null;

  if (!isPaymentMethod(paymentMethod)) {
    return NextResponse.json(
      { error: "Forma de pagamento inválida" },
      { status: 400 },
    );
  }

  const parsed = parseOrderItems(items);
  if (!parsed.ok) return parsed.response;

  const titleResult = validateOrderTitle(title);
  if (!titleResult.ok) {
    return NextResponse.json({ error: titleResult.message }, { status: 400 });
  }

  const { data, error } = await supabase.rpc("create_order_with_inventory", {
    p_title: titleResult.value,
    p_payment_method: paymentMethod,
    p_items: parsed.items,
  });

  if (error) {
    const msg = error.message ?? "";
    if (msg.includes("Estoque insuficiente")) {
      return NextResponse.json({ error: msg }, { status: 409 });
    }
    if (msg.includes("invalid_title")) {
      return NextResponse.json(
        { error: "O campo título do pedido está vazio." },
        { status: 400 },
      );
    }
    if (msg.includes("invalid_title_min_length")) {
      return NextResponse.json(
        { error: "O título do pedido deve ter no mínimo 5 caracteres." },
        { status: 400 },
      );
    }
    return NextResponse.json({ error: msg || "Erro ao criar pedido" }, { status: 400 });
  }

  return NextResponse.json(data, { status: 201 });
}
