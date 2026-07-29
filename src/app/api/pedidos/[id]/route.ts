import { NextResponse } from "next/server";
import { isPaymentMethod, parseOrderItems } from "@/lib/order-items";
import { requireAdmin, requireSession } from "@/lib/require-admin";
import { validateOrderTitle } from "@/utils/validation";

type Ctx = { params: Promise<{ id: string }> };

export async function GET(_request: Request, ctx: Ctx) {
  const g = await requireSession();
  if (!g.ok) return g.response;

  const { id } = await ctx.params;

  const { data: order, error: oe } = await g.supabase
    .from("orders")
    .select(
      "id, order_id_display, title, seller_id, payment_method, total_amount, status, created_at, updated_at",
    )
    .eq("id", id)
    .maybeSingle();

  if (oe) {
    return NextResponse.json({ error: oe.message }, { status: 500 });
  }
  if (!order) {
    return NextResponse.json({ error: "Pedido não encontrado" }, { status: 404 });
  }

  if (g.role !== "admin" && order.seller_id !== g.userId) {
    return NextResponse.json({ error: "Acesso negado" }, { status: 403 });
  }

  const { data: seller } = await g.supabase
    .from("profiles")
    .select("id, email, full_name, role")
    .eq("id", order.seller_id)
    .maybeSingle();

  const { data: items, error: ie } = await g.supabase
    .from("order_items")
    .select("id, product_id, quantity, unit_price, subtotal, created_at")
    .eq("order_id", id)
    .order("created_at");

  if (ie) {
    return NextResponse.json({ error: ie.message }, { status: 500 });
  }

  const pids = [...new Set((items ?? []).map((i) => i.product_id))];
  const products: Record<string, { name: string }> = {};
  if (pids.length > 0) {
    const { data: prows } = await g.supabase
      .from("products")
      .select("id, name")
      .in("id", pids);
    for (const p of prows ?? []) {
      products[p.id] = { name: p.name };
    }
  }

  const { data: payments, error: pe } = await g.supabase
    .from("order_payments")
    .select("id, amount, payment_method, created_at")
    .eq("order_id", id)
    .order("created_at");

  if (pe) {
    return NextResponse.json({ error: pe.message }, { status: 500 });
  }

  const amountPaid = (payments ?? []).reduce((sum, p) => sum + Number(p.amount), 0);

  return NextResponse.json({
    order,
    seller,
    items: (items ?? []).map((i) => ({
      ...i,
      product_name: products[i.product_id]?.name ?? null,
    })),
    payments: payments ?? [],
    amountPaid,
    remainingBalance: Number(order.total_amount) - amountPaid,
  });
}

export async function PATCH(request: Request, ctx: Ctx) {
  const g = await requireAdmin();
  if (!g.ok) return g.response;

  const { id } = await ctx.params;

  const { data: order, error: orderError } = await g.supabase
    .from("orders")
    .select("id, status")
    .eq("id", id)
    .maybeSingle();

  if (orderError) {
    return NextResponse.json({ error: orderError.message }, { status: 500 });
  }
  if (!order) {
    return NextResponse.json({ error: "Pedido não encontrado" }, { status: 404 });
  }

  if (order.status === "cancelled") {
    return NextResponse.json({ error: "Pedido cancelado não pode ser editado." }, { status: 400 });
  }

  if (order.status === "completed") {
    return NextResponse.json(
      {
        error:
          "Pedidos finalizados só permitem alteração da forma de pagamento. Use PATCH /api/pedidos/{id}/pagamento.",
      },
      { status: 400 },
    );
  }

  if (order.status !== "pending") {
    return NextResponse.json({ error: "Pedido não editável." }, { status: 400 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "JSON inválido" }, { status: 400 });
  }

  const b = body as Record<string, unknown>;
  const title = typeof b.title === "string" ? b.title : "";
  const items = b.items;
  const hasPaymentMethod = b.paymentMethod !== undefined && b.paymentMethod !== null;
  const paymentMethod = hasPaymentMethod ? b.paymentMethod : null;

  if (hasPaymentMethod && !isPaymentMethod(paymentMethod)) {
    return NextResponse.json(
      { error: "Forma de pagamento inválida" },
      { status: 400 },
    );
  }

  const titleResult = validateOrderTitle(title);
  if (!titleResult.ok) {
    return NextResponse.json({ error: titleResult.message }, { status: 400 });
  }

  const parsed = parseOrderItems(items);
  if (!parsed.ok) return parsed.response;

  const { data, error } = await g.supabase.rpc("edit_pending_order_with_inventory", {
    p_order_id: id,
    p_title: titleResult.value,
    p_items: parsed.items,
    p_payment_method: hasPaymentMethod ? paymentMethod : null,
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
    if (msg.includes("order_not_pending")) {
      return NextResponse.json(
        { error: "Pedido não está pendente de pagamento." },
        { status: 400 },
      );
    }
    return NextResponse.json({ error: msg || "Erro ao editar pedido" }, { status: 400 });
  }

  return NextResponse.json(data);
}
