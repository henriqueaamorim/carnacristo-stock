"use client";

import Link from "next/link";
import { useState } from "react";
import { ProductCard } from "@/components/ProductCard";
import { useProducts } from "@/hooks/useProducts";
import { useCartStore } from "@/store/cartStore";

export default function NovoPedidoPage() {
  const { data: products, isLoading, error } = useProducts();
  const orderTitle = useCartStore((s) => s.orderTitle);
  const setOrderTitle = useCartStore((s) => s.setOrderTitle);
  const lines = useCartStore((s) => s.lines);
  const [localTitle, setLocalTitle] = useState(orderTitle);

  return (
    <div className="space-y-6">
      <h1 className="text-base font-black text-black">Novo pedido</h1>

      <section className="overflow-hidden rounded-[1.4rem] border-2 border-black bg-[#eab660] shadow-[6px_6px_0_#000]">
        <div className="flex items-center justify-between border-b-2 border-black bg-[#ea5342] px-4 py-3">
          <span className="text-sm font-black uppercase tracking-wide text-black">
            Dados do pedido
          </span>
          <div className="flex items-center gap-2">
            <span
              className="h-3 w-3 rounded-full border-2 border-black bg-[#f8dcc0]"
              aria-hidden="true"
            />
            <span
              className="h-3 w-3 rounded-full border-2 border-black bg-[#f8dcc0]"
              aria-hidden="true"
            />
          </div>
        </div>
        <div className="p-4">
          <label className="block text-sm font-black text-black">
            Título do pedido
            <input
              type="text"
              placeholder='Ex: "Venda Mesa 04"'
              className="mt-1 w-full rounded-lg border-2 border-black bg-[#fff4e8] px-3 py-2 text-[#233d4d]"
              value={localTitle}
              onChange={(e) => {
                setLocalTitle(e.target.value);
                setOrderTitle(e.target.value);
              }}
            />
          </label>
        </div>
      </section>

      {isLoading && <p className="text-[#233d4d]">Carregando produtos…</p>}
      {error && (
        <p className="text-red-400" role="alert">
          {(error as Error).message}
        </p>
      )}

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        {products?.map((p, idx) => (
          <ProductCard key={p.id} product={p} imagePriority={idx < 6} />
        ))}
      </div>

      <div className="flex flex-col gap-3 border-t-2 border-black/20 pt-4 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-[#233d4d]">
          Itens no carrinho:{" "}
          <span className="font-mono text-[#233d4d]">{lines.length}</span>
        </p>
        <Link
          href="/checkout"
          className={`inline-flex justify-center rounded-lg border-2 border-black px-4 py-3 text-center font-black ${
            lines.length === 0
              ? "pointer-events-none bg-slate-300 text-slate-600"
              : "bg-[#abcf85] text-black hover:bg-emerald-500"
          }`}
          aria-disabled={lines.length === 0}
        >
          Ir para checkout
        </Link>
      </div>
    </div>
  );
}
