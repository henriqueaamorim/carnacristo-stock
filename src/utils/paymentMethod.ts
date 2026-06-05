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
