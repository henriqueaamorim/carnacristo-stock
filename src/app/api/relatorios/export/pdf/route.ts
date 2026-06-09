import { NextResponse } from "next/server";
import { PDFDocument, StandardFonts } from "pdf-lib";
import { requireAdmin } from "@/lib/require-admin";
import {
  buildReportSnapshot,
  sellerDisplayName,
} from "@/lib/reports/build-report-snapshot";
import type { PaymentMethod } from "@/types";
import {
  formatReportPaymentLabel,
  PAYMENT_METHOD_LABELS,
  PENDING_PAYMENT_KEY,
  PENDING_PAYMENT_LABEL,
  REPORT_PAYMENT_KEYS,
  revenueByMethod,
} from "@/lib/reports/payment-labels";

const PAGE = { width: 595.28, height: 841.89, margin: 40 };
const FONT_SIZE = { title: 14, section: 11, text: 9, small: 8 };
const LINE_HEIGHT = 14;

function fmtCurrency(value: number): string {
  return value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function fmtDateTime(iso: string): string {
  return new Date(iso).toLocaleString("pt-BR");
}

function clip(text: string, maxChars: number): string {
  if (text.length <= maxChars) return text;
  return `${text.slice(0, Math.max(0, maxChars - 1))}…`;
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
    return NextResponse.json({ error: error ?? "Erro ao exportar PDF" }, { status: 500 });
  }

  const pdf = await PDFDocument.create();
  const font = await pdf.embedFont(StandardFonts.Helvetica);
  const fontBold = await pdf.embedFont(StandardFonts.HelveticaBold);

  let page = pdf.addPage([PAGE.width, PAGE.height]);
  let y = PAGE.height - PAGE.margin;

  const drawText = (
    text: string,
    x: number,
    size = FONT_SIZE.text,
    bold = false,
    lineHeight = LINE_HEIGHT,
  ) => {
    page.drawText(text, {
      x,
      y,
      size,
      font: bold ? fontBold : font,
    });
    y -= lineHeight;
  };

  const ensureRoom = (required: number) => {
    if (y - required >= PAGE.margin) return;
    page = pdf.addPage([PAGE.width, PAGE.height]);
    y = PAGE.height - PAGE.margin;
  };

  const drawSectionTitle = (title: string) => {
    ensureRoom(22);
    drawText(title, PAGE.margin, FONT_SIZE.section, true, 18);
  };

  const drawTable = (columns: { label: string; width: number }[], rows: string[][]) => {
    const rowHeight = 14;
    const drawHeader = () => {
      ensureRoom(22);
      let x = PAGE.margin;
      for (const col of columns) {
        page.drawText(col.label, { x, y, size: FONT_SIZE.small, font: fontBold });
        x += col.width;
      }
      y -= rowHeight;
    };

    drawHeader();

    if (rows.length === 0) {
      drawText("Sem registros no período.", PAGE.margin, FONT_SIZE.text, false, rowHeight);
      return;
    }

    for (const row of rows) {
      ensureRoom(rowHeight + 4);
      let x = PAGE.margin;
      row.forEach((cell, idx) => {
        const maxChars = Math.max(6, Math.floor(columns[idx].width / 5));
        page.drawText(clip(cell, maxChars), {
          x,
          y,
          size: FONT_SIZE.small,
          font,
        });
        x += columns[idx].width;
      });
      y -= rowHeight;

      if (y - rowHeight < PAGE.margin) {
        page = pdf.addPage([PAGE.width, PAGE.height]);
        y = PAGE.height - PAGE.margin;
        drawHeader();
      }
    }
  };

  drawText("Relatório de vendas (PDF)", PAGE.margin, FONT_SIZE.title, true, 20);
  drawText(
    `Período: ${fmtDateTime(snapshot.from)} até ${fmtDateTime(snapshot.to)}`,
    PAGE.margin,
    FONT_SIZE.text,
  );
  drawText(
    `Filtro vendedor: ${snapshot.filters.sellerId ?? "Todos"}`,
    PAGE.margin,
    FONT_SIZE.text,
  );
  drawText(`Gerado em: ${new Date().toLocaleString("pt-BR")}`, PAGE.margin, FONT_SIZE.text);
  y -= 8;

  drawSectionTitle("Totais");
  drawText(`Receita: ${fmtCurrency(snapshot.totals.revenue)}`, PAGE.margin);
  drawText(`Unidades vendidas: ${String(snapshot.totals.unitsSold)}`, PAGE.margin);
  drawText(`Pedidos: ${String(snapshot.totals.ordersCount)}`, PAGE.margin);
  y -= 8;

  drawSectionTitle("Desempenho por vendedor");
  drawTable(
    [
      { label: "Vendedor", width: 200 },
      { label: "Receita", width: 120 },
      { label: "Unidades", width: 80 },
      { label: "Pedidos", width: 80 },
    ],
    snapshot.performance.map((p) => [
      p.full_name || p.email || p.seller_id,
      fmtCurrency(p.revenue),
      String(p.units),
      String(p.orders),
    ]),
  );
  y -= 10;

  drawSectionTitle("Desempenho por forma de pagamento");
  drawTable(
    [
      { label: "Método", width: 200 },
      { label: "Receita", width: 120 },
      { label: "Unidades", width: 80 },
      { label: "Pedidos", width: 80 },
    ],
    snapshot.paymentBreakdown.map((p) => [
      formatReportPaymentLabel(p.payment_method),
      fmtCurrency(p.revenue),
      String(p.units),
      String(p.orders),
    ]),
  );
  y -= 10;

  drawSectionTitle("Pagamento por vendedor");
  const paymentPivotColumns = [
    { label: "Vendedor", width: 110 },
    ...REPORT_PAYMENT_KEYS.map((method) => ({
      label:
        method === PENDING_PAYMENT_KEY
          ? PENDING_PAYMENT_LABEL
          : PAYMENT_METHOD_LABELS[method as PaymentMethod],
      width: 68,
    })),
  ];
  const paymentBySellerRows = snapshot.paymentBySeller.map((seller) => {
    const revenues = revenueByMethod(seller);
    return [
      sellerDisplayName(seller),
      ...REPORT_PAYMENT_KEYS.map((method) => fmtCurrency(revenues[method])),
    ];
  });
  drawTable(paymentPivotColumns, paymentBySellerRows);
  y -= 10;

  drawSectionTitle("Produtos por vendedor");
  if (snapshot.productUnitsBySeller.length === 0) {
    drawText("Sem vendedores no escopo.", PAGE.margin);
  } else {
    for (const seller of snapshot.productUnitsBySeller) {
      ensureRoom(30);
      drawText(sellerDisplayName(seller), PAGE.margin, FONT_SIZE.text, true, 16);
      drawTable(
        [
          { label: "Produto", width: 320 },
          { label: "Quantidade", width: 80 },
        ],
        seller.products.map((p) => [p.product_name, String(p.quantity)]),
      );
      y -= 8;
    }
  }

  const bytes = await pdf.save();
  return new Response(Buffer.from(bytes), {
    status: 200,
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="relatorio-${from.slice(0, 10)}-${to.slice(0, 10)}.pdf"`,
      "Cache-Control": "no-store",
    },
  });
}
