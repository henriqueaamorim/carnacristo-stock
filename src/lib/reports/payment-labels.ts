import type { PaymentMethod } from "@/types";

export const PENDING_PAYMENT_KEY = "pendente_pagamento";

export const PENDING_PAYMENT_LABEL = "Pendente de pagamento";

export type ReportPaymentKey = PaymentMethod | typeof PENDING_PAYMENT_KEY;

export const PAYMENT_METHODS: PaymentMethod[] = [
  "pix",
  "dinheiro",
  "credito",
  "debito",
  "doacao",
  "parceria",
];

export const REPORT_PAYMENT_KEYS: ReportPaymentKey[] = [
  ...PAYMENT_METHODS,
  PENDING_PAYMENT_KEY,
];

export const PAYMENT_METHOD_LABELS: Record<PaymentMethod, string> = {
  pix: "PIX",
  dinheiro: "Dinheiro",
  credito: "Crédito",
  debito: "Débito",
  doacao: "Doação",
  parceria: "Parceria",
};

export type SellerPaymentMethods = {
  methods: { payment_method: string; revenue: number }[];
};

export function normalizeReportPaymentMethod(
  method: string | null | undefined,
): string {
  if (method == null || method === "") return PENDING_PAYMENT_KEY;
  return method;
}

export function formatReportPaymentLabel(method: string): string {
  if (method === PENDING_PAYMENT_KEY) return PENDING_PAYMENT_LABEL;
  if (PAYMENT_METHODS.includes(method as PaymentMethod)) {
    return PAYMENT_METHOD_LABELS[method as PaymentMethod];
  }
  return method;
}

export function revenueByMethod(
  seller: SellerPaymentMethods,
): Record<ReportPaymentKey, number> {
  const map = {} as Record<ReportPaymentKey, number>;
  for (const method of PAYMENT_METHODS) map[method] = 0;
  map[PENDING_PAYMENT_KEY] = 0;
  for (const m of seller.methods) {
    const key = normalizeReportPaymentMethod(m.payment_method);
    if (
      PAYMENT_METHODS.includes(key as PaymentMethod) ||
      key === PENDING_PAYMENT_KEY
    ) {
      map[key as ReportPaymentKey] = m.revenue;
    }
  }
  return map;
}

export function fmtRevenueBrl(value: number): string {
  return value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}
