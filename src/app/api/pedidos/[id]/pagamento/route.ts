import { NextResponse } from "next/server";
import { isPaymentMethod } from "@/lib/order-items";
import { requireAdmin } from "@/lib/require-admin";

type Ctx = { params: Promise<{ id: string }> };

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

  const paymentMethod =
    typeof body === "object" && body !== null && "paymentMethod" in body
      ? (body as { paymentMethod: unknown }).paymentMethod
      : null;

  if (!isPaymentMethod(paymentMethod)) {
    return NextResponse.json(
      { error: "Forma de pagamento inválida" },
      { status: 400 },
    );
  }

  const { data, error } = await g.supabase.rpc("update_completed_order_payment", {
    p_order_id: id,
    p_payment_method: paymentMethod,
  });

  if (error) {
    const msg = error.message ?? "";
    if (msg.includes("order_not_found")) {
      return NextResponse.json({ error: "Pedido não encontrado" }, { status: 404 });
    }
    if (msg.includes("order_not_completed")) {
      return NextResponse.json(
        { error: "Só é possível alterar pagamento de pedidos finalizados." },
        { status: 400 },
      );
    }
    return NextResponse.json(
      { error: msg || "Erro ao alterar forma de pagamento" },
      { status: 400 },
    );
  }

  return NextResponse.json(data);
}
