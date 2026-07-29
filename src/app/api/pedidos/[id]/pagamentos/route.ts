import { NextResponse } from "next/server";
import { isPaymentMethod } from "@/lib/order-items";
import { requireSession } from "@/lib/require-admin";

type Ctx = { params: Promise<{ id: string }> };

export async function POST(request: Request, ctx: Ctx) {
  const g = await requireSession();
  if (!g.ok) return g.response;

  const { id } = await ctx.params;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "JSON inválido" }, { status: 400 });
  }

  const b = body as Record<string, unknown>;
  const paymentMethod = b.paymentMethod;
  const amountRaw = b.amount;

  if (!isPaymentMethod(paymentMethod)) {
    return NextResponse.json(
      { error: "Forma de pagamento inválida" },
      { status: 400 },
    );
  }

  const amount = Number(amountRaw);
  if (!Number.isFinite(amount) || amount <= 0) {
    return NextResponse.json(
      { error: "Valor de pagamento inválido." },
      { status: 400 },
    );
  }

  const { data, error } = await g.supabase.rpc("register_order_payment", {
    p_order_id: id,
    p_amount: amount,
    p_payment_method: paymentMethod,
  });

  if (error) {
    const msg = error.message ?? "";
    if (msg.includes("order_not_found")) {
      return NextResponse.json({ error: "Pedido não encontrado" }, { status: 404 });
    }
    if (msg.includes("order_not_pending")) {
      return NextResponse.json(
        { error: "Pedido não está pendente de pagamento." },
        { status: 400 },
      );
    }
    if (msg.includes("payment_exceeds_balance")) {
      return NextResponse.json(
        { error: "Valor informado é maior que o saldo pendente." },
        { status: 409 },
      );
    }
    if (msg.includes("invalid_payment_amount")) {
      return NextResponse.json(
        { error: "Valor de pagamento inválido." },
        { status: 400 },
      );
    }
    if (msg.includes("forbidden")) {
      return NextResponse.json({ error: "Acesso negado" }, { status: 403 });
    }
    return NextResponse.json(
      { error: msg || "Erro ao registrar pagamento" },
      { status: 400 },
    );
  }

  return NextResponse.json(data);
}
