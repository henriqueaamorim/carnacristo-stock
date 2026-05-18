import { NextResponse } from "next/server";
import { isPaymentMethod, parseOrderItems } from "@/lib/order-items";
import { requireAdmin } from "@/lib/require-admin";

type Ctx = { params: Promise<{ id: string }> };

export async function GET(_request: Request, ctx: Ctx) {
  const g = await requireAdmin();
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

  return NextResponse.json({
    order,
    seller,
    items: (items ?? []).map((i) => ({
      ...i,
      product_name: products[i.product_id]?.name ?? null,
    })),
  });
}

export async function PATCH(request: Request, ctx: Ctx) {
  const g = await requireAdmin();
  if (!g.ok) return g.response;

  const { id } = await ctx.params;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "JSON inválido" }, { status: 400 });
  }

  const b = body as Record<string, unknown>;
  const title = typeof b.title === "string" ? b.title : "";
  const paymentMethod = b.paymentMethod;
  const items = b.items;

  if (!isPaymentMethod(paymentMethod)) {
    return NextResponse.json(
      { error: "Forma de pagamento inválida" },
      { status: 400 },
    );
  }

  const parsed = parseOrderItems(items);
  if (!parsed.ok) return parsed.response;

  const { data, error } = await g.supabase.rpc(
    "edit_order_with_inventory_adjustment",
    {
      p_order_id: id,
      p_title: title,
      p_payment_method: paymentMethod,
      p_items: parsed.items,
    },
  );

  if (error) {
    const msg = error.message ?? "";
    if (msg.includes("Estoque insuficiente")) {
      return NextResponse.json({ error: msg }, { status: 409 });
    }
    return NextResponse.json({ error: msg || "Erro ao editar pedido" }, { status: 400 });
  }

  return NextResponse.json(data);
}
