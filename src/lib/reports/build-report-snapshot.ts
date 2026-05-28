import { createClient } from "@/lib/supabase/server";
import { PAYMENT_METHODS } from "@/lib/reports/payment-labels";
import type { PaymentMethod } from "@/types";

type SupabaseClient = Awaited<ReturnType<typeof createClient>>;

export { PAYMENT_METHODS };

export type ReportOrder = {
  id: string;
  order_id_display: string | null;
  title: string | null;
  seller_id: string;
  payment_method: string;
  total_amount: number;
  created_at: string;
};

export type ReportOrderItem = {
  order_id: string;
  product_id: string;
  quantity: number;
  unit_price: number;
  subtotal: number;
};

export type ReportSellerPerformance = {
  seller_id: string;
  email: string | null;
  full_name: string | null;
  revenue: number;
  units: number;
  orders: number;
};

export type ReportPaymentBreakdown = {
  payment_method: string;
  revenue: number;
  units: number;
  orders: number;
};

export type ReportProductCatalogEntry = {
  product_id: string;
  product_name: string;
};

export type ReportPaymentBySeller = {
  seller_id: string;
  email: string | null;
  full_name: string | null;
  methods: {
    payment_method: PaymentMethod;
    revenue: number;
    units: number;
    orders: number;
  }[];
};

export type ReportProductUnitsBySeller = {
  seller_id: string;
  email: string | null;
  full_name: string | null;
  products: {
    product_id: string;
    product_name: string;
    quantity: number;
  }[];
};

export type ReportSnapshot = {
  from: string;
  to: string;
  filters: { sellerId: string | null };
  orders: ReportOrder[];
  items: ReportOrderItem[];
  productNamesById: Record<string, string>;
  sellerMetaById: Record<string, { email: string | null; full_name: string | null }>;
  productsCatalog: ReportProductCatalogEntry[];
  totals: { revenue: number; unitsSold: number; ordersCount: number };
  performance: ReportSellerPerformance[];
  paymentBreakdown: ReportPaymentBreakdown[];
  paymentBySeller: ReportPaymentBySeller[];
  productUnitsBySeller: ReportProductUnitsBySeller[];
  checksum: { orderItemsQuantitySum: number };
};

type SellerMetrics = { revenue: number; units: number; orders: number };

export async function buildReportSnapshot(
  supabase: SupabaseClient,
  params: { from: string; to: string; sellerId?: string | null },
): Promise<{ data: ReportSnapshot | null; error: string | null }> {
  const { from, to, sellerId } = params;

  const { data: catalogRaw, error: catalogError } = await supabase
    .from("products")
    .select("id, name")
    .order("name");

  if (catalogError) return { data: null, error: catalogError.message };

  const productsCatalog: ReportProductCatalogEntry[] = (catalogRaw ?? []).map((p) => ({
    product_id: p.id,
    product_name: p.name,
  }));

  const productNamesById: Record<string, string> = {};
  for (const p of productsCatalog) productNamesById[p.product_id] = p.product_name;

  let ordersQuery = supabase
    .from("orders")
    .select(
      "id, order_id_display, title, seller_id, payment_method, total_amount, created_at",
    )
    .eq("status", "completed")
    .gte("created_at", from)
    .lte("created_at", to)
    .order("created_at", { ascending: true });

  if (sellerId) ordersQuery = ordersQuery.eq("seller_id", sellerId);

  const { data: ordersRaw, error: ordersError } = await ordersQuery;
  if (ordersError) return { data: null, error: ordersError.message };

  const orders: ReportOrder[] = (ordersRaw ?? []).map((o) => ({
    id: o.id,
    order_id_display: o.order_id_display,
    title: o.title,
    seller_id: o.seller_id,
    payment_method: String(o.payment_method),
    total_amount: Number(o.total_amount),
    created_at: o.created_at,
  }));

  const orderIds = orders.map((o) => o.id);
  let items: ReportOrderItem[] = [];

  if (orderIds.length > 0) {
    const { data: itemsRaw, error: itemsError } = await supabase
      .from("order_items")
      .select("order_id, product_id, quantity, unit_price, subtotal")
      .in("order_id", orderIds);

    if (itemsError) return { data: null, error: itemsError.message };

    items = (itemsRaw ?? []).map((it) => ({
      order_id: it.order_id,
      product_id: it.product_id,
      quantity: Number(it.quantity),
      unit_price: Number(it.unit_price),
      subtotal: Number(it.subtotal),
    }));
  }

  for (const item of items) {
    if (!productNamesById[item.product_id]) {
      productNamesById[item.product_id] = item.product_id;
    }
  }

  const sellerIdsInScope = new Set(orders.map((o) => o.seller_id));
  if (sellerId) sellerIdsInScope.add(sellerId);

  const sellerMetaById: Record<string, { email: string | null; full_name: string | null }> = {};
  const scopeSellerIds = [...sellerIdsInScope];

  if (scopeSellerIds.length > 0) {
    const { data: profiles, error: profilesError } = await supabase
      .from("profiles")
      .select("id, email, full_name")
      .in("id", scopeSellerIds);

    if (profilesError) return { data: null, error: profilesError.message };

    for (const profile of profiles ?? []) {
      sellerMetaById[profile.id] = {
        email: profile.email,
        full_name: profile.full_name,
      };
    }
  }

  const orderById = new Map(orders.map((o) => [o.id, o]));
  const qtyByOrder = new Map<string, number>();
  for (const item of items) {
    qtyByOrder.set(item.order_id, (qtyByOrder.get(item.order_id) ?? 0) + item.quantity);
  }

  let totalRevenue = 0;
  let totalUnits = 0;
  const bySeller = new Map<string, SellerMetrics>();
  const byPayment = new Map<string, SellerMetrics>();
  const paymentBySellerMap = new Map<string, Map<string, SellerMetrics>>();
  const productQtyBySeller = new Map<string, Map<string, number>>();

  for (const order of orders) {
    const revenue = Number(order.total_amount);
    const units = qtyByOrder.get(order.id) ?? 0;
    totalRevenue += revenue;
    totalUnits += units;

    const sellerPrev = bySeller.get(order.seller_id) ?? { revenue: 0, units: 0, orders: 0 };
    bySeller.set(order.seller_id, {
      revenue: sellerPrev.revenue + revenue,
      units: sellerPrev.units + units,
      orders: sellerPrev.orders + 1,
    });

    const paymentPrev = byPayment.get(order.payment_method) ?? {
      revenue: 0,
      units: 0,
      orders: 0,
    };
    byPayment.set(order.payment_method, {
      revenue: paymentPrev.revenue + revenue,
      units: paymentPrev.units + units,
      orders: paymentPrev.orders + 1,
    });

    const sellerPaymentMap =
      paymentBySellerMap.get(order.seller_id) ?? new Map<string, SellerMetrics>();
    const methodPrev = sellerPaymentMap.get(order.payment_method) ?? {
      revenue: 0,
      units: 0,
      orders: 0,
    };
    sellerPaymentMap.set(order.payment_method, {
      revenue: methodPrev.revenue + revenue,
      units: methodPrev.units + units,
      orders: methodPrev.orders + 1,
    });
    paymentBySellerMap.set(order.seller_id, sellerPaymentMap);
  }

  for (const item of items) {
    const order = orderById.get(item.order_id);
    if (!order) continue;

    const sellerProducts =
      productQtyBySeller.get(order.seller_id) ?? new Map<string, number>();
    sellerProducts.set(
      item.product_id,
      (sellerProducts.get(item.product_id) ?? 0) + item.quantity,
    );
    productQtyBySeller.set(order.seller_id, sellerProducts);
  }

  const performance: ReportSellerPerformance[] = [...bySeller.entries()].map(
    ([id, values]) => ({
      seller_id: id,
      email: sellerMetaById[id]?.email ?? null,
      full_name: sellerMetaById[id]?.full_name ?? null,
      ...values,
    }),
  );

  const paymentBreakdown: ReportPaymentBreakdown[] = [...byPayment.entries()].map(
    ([payment_method, values]) => ({
      payment_method,
      ...values,
    }),
  );

  const sortedScopeSellerIds = [...sellerIdsInScope].sort((a, b) => {
    const nameA = sellerMetaById[a]?.full_name || sellerMetaById[a]?.email || a;
    const nameB = sellerMetaById[b]?.full_name || sellerMetaById[b]?.email || b;
    return nameA.localeCompare(nameB, "pt-BR");
  });

  const paymentBySeller: ReportPaymentBySeller[] = sortedScopeSellerIds.map((id) => {
    const sellerPayments = paymentBySellerMap.get(id);
    return {
      seller_id: id,
      email: sellerMetaById[id]?.email ?? null,
      full_name: sellerMetaById[id]?.full_name ?? null,
      methods: PAYMENT_METHODS.map((payment_method) => {
        const m = sellerPayments?.get(payment_method);
        return {
          payment_method,
          revenue: m?.revenue ?? 0,
          units: m?.units ?? 0,
          orders: m?.orders ?? 0,
        };
      }),
    };
  });

  const productUnitsBySeller: ReportProductUnitsBySeller[] = sortedScopeSellerIds.map((id) => {
    const sellerProducts = productQtyBySeller.get(id);
    return {
      seller_id: id,
      email: sellerMetaById[id]?.email ?? null,
      full_name: sellerMetaById[id]?.full_name ?? null,
      products: productsCatalog.map((product) => ({
        product_id: product.product_id,
        product_name: product.product_name,
        quantity: sellerProducts?.get(product.product_id) ?? 0,
      })),
    };
  });

  return {
    data: {
      from,
      to,
      filters: { sellerId: sellerId ?? null },
      orders,
      items,
      productNamesById,
      sellerMetaById,
      productsCatalog,
      totals: {
        revenue: totalRevenue,
        unitsSold: totalUnits,
        ordersCount: orders.length,
      },
      performance,
      paymentBreakdown,
      paymentBySeller,
      productUnitsBySeller,
      checksum: {
        orderItemsQuantitySum: items.reduce((sum, item) => sum + item.quantity, 0),
      },
    },
    error: null,
  };
}

export function sellerDisplayName(
  seller: { seller_id: string; full_name: string | null; email: string | null },
): string {
  return seller.full_name?.trim() || seller.email || seller.seller_id;
}
