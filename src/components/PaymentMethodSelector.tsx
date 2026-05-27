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
    <fieldset className="overflow-hidden rounded-[1.4rem] border-2 border-black bg-[#eab660] shadow-[6px_6px_0_#000]">
      <legend className="sr-only">Forma de pagamento</legend>
      <div className="border-b-2 border-black bg-[#ea5342] px-4 py-3">
        <p className="text-sm font-black uppercase tracking-wide text-black">
          Forma de pagamento
        </p>
      </div>
      <div className="grid gap-2 p-4 sm:grid-cols-2">
        {ORDER.map((m) => (
          <label
            key={m}
            className="flex cursor-pointer items-center gap-2 rounded-lg border-2 border-black bg-[#fff4e8] px-3 py-2 text-[#233d4d] has-[:checked]:bg-[#abcf85]"
          >
            <input
              type="radio"
              name="payment"
              value={m}
              checked={value === m}
              onChange={() => onChange(m)}
              className="h-4 w-4 accent-emerald-600"
            />
            <span className="font-black text-black">{LABELS[m]}</span>
          </label>
        ))}
      </div>
    </fieldset>
  );
}
