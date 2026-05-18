"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useEffect } from "react";
import { useCartStore } from "@/store/cartStore";

export default function SucessoInner() {
  const params = useSearchParams();
  const clear = useCartStore((s) => s.clear);

  useEffect(() => {
    clear();
  }, [clear]);

  const display = params.get("display") ?? "—";
  const total = params.get("total");
  const method = params.get("method") ?? "—";

  const totalFmt =
    total != null && !Number.isNaN(Number(total))
      ? Number(total).toLocaleString("pt-BR", {
          style: "currency",
          currency: "BRL",
        })
      : total;

  return (
    <div className="space-y-6 text-center">
      <div className="rounded-xl border border-slate-700 bg-orange-200/50 p-8">
        <p className="text-lg text-[#233d4d]">Pedido finalizado com sucesso</p>
        <p className="mt-2 text-2xl font-bold text-[#233d4d]">#{display}</p>
        <p className="mt-4 text-[#233d4d]">
          Total: <span className="font-medium">{totalFmt}</span>
        </p>
        <p className="mt-1 text-[#233d4d]">
          Método: <span className="font-medium">{method}</span>
        </p>
      </div>
      <div className="flex flex-col gap-3 sm:flex-row sm:justify-center">
        <Link
          href="/novo-pedido"
          className="rounded-lg bg-emerald-600 px-6 py-3 font-medium text-white hover:bg-emerald-500"
        >
          Novo pedido
        </Link>
        <Link
          href="/checkout"
          className="rounded-lg border border-slate-600 px-6 py-3 text-[#233d4d] hover:bg-orange-200"
        >
          Voltar ao checkout
        </Link>
      </div>
    </div>
  );
}
