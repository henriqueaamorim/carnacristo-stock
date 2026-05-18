import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/require-admin";

function escCell(v: string | number | null | undefined) {
  const s = v == null ? "" : String(v);
  if (/[",\n\r]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

export async function GET(request: Request) {
  const g = await requireAdmin();
  if (!g.ok) return g.response;

  const u = new URL(request.url);
  const from = u.searchParams.get("from");
  const to = u.searchParams.get("to");
  const sellerId = u.searchParams.get("sellerId");

  if (!from || !to) {
    return NextResponse.json(
      { error: "Parâmetros obrigatórios: from, to (ISO 8601)" },
      { status: 400 },
    );
  }

  let oq = g.supabase
    .from("orders")
    .select(
      "id, order_id_display, title, seller_id, payment_method, total_amount, created_at",
    )
    .eq("status", "completed")
    .gte("created_at", from)
    .lte("created_at", to)
    .order("created_at", { ascending: true });

  if (sellerId) oq = oq.eq("seller_id", sellerId);

  const { data: orders, error: oe } = await oq;
  if (oe) {
    return NextResponse.json({ error: oe.message }, { status: 500 });
  }

  const orderList = orders ?? [];
  const orderIds = orderList.map((o) => o.id);

  let items: {
    order_id: string;
    product_id: string;
    quantity: number;
    unit_price: number;
    subtotal: number;
  }[] = [];

  if (orderIds.length > 0) {
    const { data: it, error: ie } = await g.supabase
      .from("order_items")
      .select("order_id, product_id, quantity, unit_price, subtotal")
      .in("order_id", orderIds);
    if (ie) {
      return NextResponse.json({ error: ie.message }, { status: 500 });
    }
    items = (it ?? []) as typeof items;
  }

  const pids = [...new Set(items.map((i) => i.product_id))];
  const names: Record<string, string> = {};
  if (pids.length > 0) {
    const { data: prows } = await g.supabase
      .from("products")
      .select("id, name")
      .in("id", pids);
    for (const p of prows ?? []) names[p.id] = p.name;
  }

  const sellerIds = [...new Set(orderList.map((o) => o.seller_id))];
  const sellers: Record<string, string> = {};
  if (sellerIds.length > 0) {
    const { data: profs } = await g.supabase
      .from("profiles")
      .select("id, email")
      .in("id", sellerIds);
    for (const p of profs ?? []) sellers[p.id] = p.email ?? p.id;
  }

  const header = [
    "order_id",
    "order_id_display",
    "title",
    "seller_id",
    "seller_email",
    "payment_method",
    "order_total",
    "order_created_at",
    "product_id",
    "product_name",
    "quantity",
    "unit_price",
    "line_subtotal",
  ];

  const lines: string[] = [header.map(escCell).join(",")];

  const orderMap = new Map(orderList.map((o) => [o.id, o]));

  for (const it of items) {
    const o = orderMap.get(it.order_id);
    if (!o) continue;
    lines.push(
      [
        o.id,
        o.order_id_display,
        o.title,
        o.seller_id,
        sellers[o.seller_id] ?? "",
        o.payment_method,
        o.total_amount,
        o.created_at,
        it.product_id,
        names[it.product_id] ?? "",
        it.quantity,
        it.unit_price,
        it.subtotal,
      ]
        .map(escCell)
        .join(","),
    );
  }

  const csv = lines.join("\r\n");

  return new NextResponse(csv, {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="relatorio-${from.slice(0, 10)}-${to.slice(0, 10)}.csv"`,
    },
  });
}
