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
      <div className="overflow-hidden rounded-[1.4rem] border-2 border-black bg-[#eab660] shadow-[6px_6px_0_#000]">
        <div className="border-b-2 border-black bg-[#ea5342] px-4 py-3">
          <p className="text-sm font-black uppercase tracking-wide text-black">
            Pedido finalizado com sucesso
          </p>
        </div>
        <div className="p-8">
        <p className="mt-2 text-2xl font-black text-black">#{display}</p>
        <p className="mt-4 text-[#233d4d]">
          Total: <span className="font-black">{totalFmt}</span>
        </p>
        <p className="mt-1 text-[#233d4d]">
          Método: <span className="font-black">{method}</span>
        </p>
        </div>
      </div>
      <div className="flex flex-col gap-3 sm:flex-row sm:justify-center">
        <Link
          href="/novo-pedido"
          className="rounded-lg border-2 border-black bg-[#abcf85] px-6 py-3 font-black text-black hover:bg-emerald-500"
        >
          Novo pedido
        </Link>
        <Link
          href="/checkout"
          className="rounded-lg border-2 border-black bg-[#fff4e8] px-6 py-3 font-black text-black"
        >
          Voltar ao checkout
        </Link>
      </div>
    </div>
  );
}
