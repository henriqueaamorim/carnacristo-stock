import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/require-admin";

function parseRange(url: URL) {
  const from = url.searchParams.get("from");
  const to = url.searchParams.get("to");
  if (!from || !to) {
    return {
      ok: false as const,
      response: NextResponse.json(
        { error: "Parâmetros obrigatórios: from, to (ISO 8601)" },
        { status: 400 },
      ),
    };
  }
  return { ok: true as const, from, to };
}

export async function GET(request: Request) {
  const g = await requireAdmin();
  if (!g.ok) return g.response;

  const u = new URL(request.url);
  const range = parseRange(u);
  if (!range.ok) return range.response;

  const sellerId = u.searchParams.get("sellerId");

  let oq = g.supabase
    .from("orders")
    .select("id, seller_id, payment_method, total_amount, created_at")
    .eq("status", "completed")
    .gte("created_at", range.from)
    .lte("created_at", range.to);

  if (sellerId) oq = oq.eq("seller_id", sellerId);

  const { data: orders, error: oe } = await oq;

  if (oe) {
    return NextResponse.json({ error: oe.message }, { status: 500 });
  }

  const orderList = orders ?? [];
  const orderIds = orderList.map((o) => o.id);

  let items: { order_id: string; quantity: number }[] = [];
  if (orderIds.length > 0) {
    const { data: it, error: ie } = await g.supabase
      .from("order_items")
      .select("order_id, quantity")
      .in("order_id", orderIds);
    if (ie) {
      return NextResponse.json({ error: ie.message }, { status: 500 });
    }
    items = it ?? [];
  }

  const qtyByOrder = new Map<string, number>();
  for (const it of items) {
    qtyByOrder.set(it.order_id, (qtyByOrder.get(it.order_id) ?? 0) + it.quantity);
  }

  let totalRevenue = 0;
  let totalUnits = 0;
  const bySeller = new Map<
    string,
    { revenue: number; units: number; orders: number }
  >();
  const byPayment = new Map<
    string,
    { revenue: number; units: number; orders: number }
  >();

  for (const o of orderList) {
    const rev = Number(o.total_amount);
    const units = qtyByOrder.get(o.id) ?? 0;
    totalRevenue += rev;
    totalUnits += units;

    const sk = o.seller_id;
    const sPrev = bySeller.get(sk) ?? { revenue: 0, units: 0, orders: 0 };
    bySeller.set(sk, {
      revenue: sPrev.revenue + rev,
      units: sPrev.units + units,
      orders: sPrev.orders + 1,
    });

    const pk = String(o.payment_method);
    const pPrev = byPayment.get(pk) ?? { revenue: 0, units: 0, orders: 0 };
    byPayment.set(pk, {
      revenue: pPrev.revenue + rev,
      units: pPrev.units + units,
      orders: pPrev.orders + 1,
    });
  }

  const sellerIds = [...bySeller.keys()];
  const sellerMeta: Record<string, { email: string | null; full_name: string | null }> =
    {};
  if (sellerIds.length > 0) {
    const { data: profs } = await g.supabase
      .from("profiles")
      .select("id, email, full_name")
      .in("id", sellerIds);
    for (const p of profs ?? []) {
      sellerMeta[p.id] = { email: p.email, full_name: p.full_name };
    }
  }

  const performance = sellerIds.map((id) => ({
    seller_id: id,
    ...sellerMeta[id],
    ...bySeller.get(id)!,
  }));

  const paymentBreakdown = [...byPayment.entries()].map(([payment_method, v]) => ({
    payment_method,
    ...v,
  }));

  const checksumItems = items.reduce((s, i) => s + i.quantity, 0);

  return NextResponse.json({
    from: range.from,
    to: range.to,
    filters: { sellerId },
    totals: {
      revenue: totalRevenue,
      unitsSold: totalUnits,
      ordersCount: orderList.length,
    },
    performance,
    paymentBreakdown,
    checksum: {
      /** Soma de quantidades em order_items dos pedidos completed no período */
      orderItemsQuantitySum: checksumItems,
    },
  });
}
