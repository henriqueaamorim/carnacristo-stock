import type { PaymentMethod } from "@/types";

export const PAYMENT_METHOD_LABELS: Record<PaymentMethod, string> = {
  pix: "PIX",
  dinheiro: "Dinheiro",
  credito: "Crédito",
  debito: "Débito",
  doacao: "Doação",
  parceria: "Parceria",
};

export const PAYMENT_METHOD_ORDER: PaymentMethod[] = [
  "pix",
  "dinheiro",
  "credito",
  "debito",
  "doacao",
  "parceria",
];

export function formatPaymentMethod(
  method: PaymentMethod | string | null | undefined,
): string {
  if (method == null || method === "") return "A definir";
  if (method in PAYMENT_METHOD_LABELS) {
    return PAYMENT_METHOD_LABELS[method as PaymentMethod];
  }
  return method;
}
