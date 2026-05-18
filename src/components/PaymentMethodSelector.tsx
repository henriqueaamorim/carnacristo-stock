"use client";

import type { PaymentMethod } from "@/types";

const LABELS: Record<PaymentMethod, string> = {
  pix: "PIX",
  dinheiro: "Dinheiro",
  credito: "Crédito",
  debito: "Débito",
  doacao: "Doação",
  parceria: "Parceria",
};

const ORDER: PaymentMethod[] = [
  "pix",
  "dinheiro",
  "credito",
  "debito",
  "doacao",
  "parceria",
];

type Props = {
  value: PaymentMethod | null;
  onChange: (v: PaymentMethod) => void;
};

export function PaymentMethodSelector({ value, onChange }: Props) {
  return (
    <fieldset className="space-y-2">
      <legend className="mb-2 text-sm font-medium text-[#233d4d]">
        Forma de pagamento
      </legend>
      <div className="grid gap-2 sm:grid-cols-2">
        {ORDER.map((m) => (
          <label
            key={m}
            className="flex cursor-pointer items-center gap-2 rounded-lg border border-slate-600 bg-orange-200/50 px-3 py-2 text-[#233d4d] has-[:checked]:border-emerald-500 has-[:checked]:bg-orange-200"
          >
            <input
              type="radio"
              name="payment"
              value={m}
              checked={value === m}
              onChange={() => onChange(m)}
              className="h-4 w-4 accent-emerald-500"
            />
            <span>{LABELS[m]}</span>
          </label>
        ))}
      </div>
    </fieldset>
  );
}
