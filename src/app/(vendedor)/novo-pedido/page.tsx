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
      <h1 className="text-xl font-semibold text-[#233d4d]">Novo pedido</h1>

      <label className="block text-sm text-[#233d4d]">
        Título do pedido
        <input
          type="text"
          placeholder='Ex: "Venda Mesa 04"'
          className="mt-1 w-full rounded-lg border border-slate-600 bg-orange-200 px-3 py-2 text-[#233d4d]"
          value={localTitle}
          onChange={(e) => {
            setLocalTitle(e.target.value);
            setOrderTitle(e.target.value);
          }}
        />
      </label>

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

      <div className="flex flex-col gap-3 border-t border-slate-800 pt-4 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-[#233d4d]">
          Itens no carrinho:{" "}
          <span className="font-mono text-[#233d4d]">{lines.length}</span>
        </p>
        <Link
          href="/checkout"
          className={`inline-flex justify-center rounded-lg px-4 py-3 text-center font-medium ${
            lines.length === 0
              ? "pointer-events-none bg-slate-700 text-slate-400"
              : "bg-emerald-600 text-white hover:bg-emerald-500"
          }`}
          aria-disabled={lines.length === 0}
        >
          Ir para checkout
        </Link>
      </div>
    </div>
  );
}
