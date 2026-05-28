import type { PaymentMethod } from "@/types";

export const PAYMENT_METHODS: PaymentMethod[] = [
  "pix",
  "dinheiro",
  "credito",
  "debito",
  "doacao",
  "parceria",
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

export function revenueByMethod(seller: SellerPaymentMethods): Record<PaymentMethod, number> {
  const map = {} as Record<PaymentMethod, number>;
  for (const method of PAYMENT_METHODS) map[method] = 0;
  for (const m of seller.methods) {
    if (PAYMENT_METHODS.includes(m.payment_method as PaymentMethod)) {
      map[m.payment_method as PaymentMethod] = m.revenue;
    }
  }
  return map;
}

export function fmtRevenueBrl(value: number): string {
  return value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}
