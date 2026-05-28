import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/require-admin";
import {
  buildReportSnapshot,
  sellerDisplayName,
} from "@/lib/reports/build-report-snapshot";
import { PAYMENT_METHODS, revenueByMethod } from "@/lib/reports/payment-labels";

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

  const { data: snapshot, error } = await buildReportSnapshot(g.supabase, {
    from,
    to,
    sellerId,
  });
  if (error || !snapshot) {
    return NextResponse.json({ error: error ?? "Erro ao exportar relatório" }, { status: 500 });
  }

  const lines: string[] = ["# detalhe_pedidos"];

  const detailHeader = [
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

  lines.push(detailHeader.map(escCell).join(","));

  const orderMap = new Map(snapshot.orders.map((o) => [o.id, o]));

  for (const it of snapshot.items) {
    const o = orderMap.get(it.order_id);
    if (!o) continue;
    lines.push(
      [
        o.id,
        o.order_id_display,
        o.title,
        o.seller_id,
        snapshot.sellerMetaById[o.seller_id]?.email ?? "",
        o.payment_method,
        o.total_amount,
        o.created_at,
        it.product_id,
        snapshot.productNamesById[it.product_id] ?? "",
        it.quantity,
        it.unit_price,
        it.subtotal,
      ]
        .map(escCell)
        .join(","),
    );
  }

  lines.push("");
  lines.push("# pagamento_por_vendedor");
  lines.push(
    ["seller_id", "seller_name", ...PAYMENT_METHODS].map(escCell).join(","),
  );
  for (const seller of snapshot.paymentBySeller) {
    const name = sellerDisplayName(seller);
    const revenues = revenueByMethod(seller);
    lines.push(
      [seller.seller_id, name, ...PAYMENT_METHODS.map((m) => revenues[m])]
        .map(escCell)
        .join(","),
    );
  }

  lines.push("");
  lines.push("# produtos_por_vendedor");
  lines.push(
    ["seller_id", "seller_name", "product_id", "product_name", "quantity"]
      .map(escCell)
      .join(","),
  );
  for (const seller of snapshot.productUnitsBySeller) {
    const name = sellerDisplayName(seller);
    for (const product of seller.products) {
      lines.push(
        [seller.seller_id, name, product.product_id, product.product_name, product.quantity]
          .map(escCell)
          .join(","),
      );
    }
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
