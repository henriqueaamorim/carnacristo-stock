import { NextResponse } from "next/server";
import { requireSession } from "@/lib/require-admin";

export async function GET() {
  const g = await requireSession();
  if (!g.ok) return g.response;

  const { data: orders, error } = await g.supabase
    .from("orders")
    .select("id, order_id_display, title, total_amount, status, created_at")
    .eq("seller_id", g.userId)
    .eq("status", "pending")
    .order("created_at", { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const orderIds = (orders ?? []).map((o) => o.id);
  const paidByOrder: Record<string, number> = {};

  if (orderIds.length > 0) {
    const { data: payments, error: pe } = await g.supabase
      .from("order_payments")
      .select("order_id, amount")
      .in("order_id", orderIds);

    if (pe) {
      return NextResponse.json({ error: pe.message }, { status: 500 });
    }

    for (const p of payments ?? []) {
      paidByOrder[p.order_id] = (paidByOrder[p.order_id] ?? 0) + Number(p.amount);
    }
  }

  return NextResponse.json(
    (orders ?? []).map((o) => {
      const amountPaid = paidByOrder[o.id] ?? 0;
      return {
        ...o,
        amountPaid,
        remainingBalance: Number(o.total_amount) - amountPaid,
      };
    }),
  );
}
