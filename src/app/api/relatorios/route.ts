import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/require-admin";
import { buildReportSnapshot } from "@/lib/reports/build-report-snapshot";

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
  const { data: snapshot, error } = await buildReportSnapshot(g.supabase, {
    from: range.from,
    to: range.to,
    sellerId,
  });
  if (error || !snapshot) {
    return NextResponse.json({ error: error ?? "Erro ao gerar relatório" }, { status: 500 });
  }

  return NextResponse.json({
    from: snapshot.from,
    to: snapshot.to,
    filters: snapshot.filters,
    totals: snapshot.totals,
    performance: snapshot.performance,
    paymentBreakdown: snapshot.paymentBreakdown,
    productsCatalog: snapshot.productsCatalog,
    paymentBySeller: snapshot.paymentBySeller,
    productUnitsBySeller: snapshot.productUnitsBySeller,
    checksum: snapshot.checksum,
  });
}
