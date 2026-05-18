"use client";

import Image from "next/image";
import { useState } from "react";
import type { ProductDTO } from "@/types";
import { useCartStore } from "@/store/cartStore";

type Props = {
  product: ProductDTO;
  /** Primeiros cards: prioridade de LCP (next/image). */
  imagePriority?: boolean;
};

export function ProductCard({ product, imagePriority = false }: Props) {
  const addOrIncrement = useCartStore((s) => s.addOrIncrement);
  const line = useCartStore((s) =>
    s.lines.find((l) => l.productId === product.id),
  );
  const qty = line?.quantity ?? 0;
  const [msg, setMsg] = useState<string | null>(null);

  const stock = product.stock_quantity;
  const canAdd = stock > 0 && qty < stock;

  return (
    <article className="flex flex-col overflow-hidden rounded-xl border border-slate-700 bg-orange-200/50 shadow-lg">
      <div className="relative aspect-square w-full bg-orange-200">
        {product.imageSignedUrl ? (
          <Image
            src={product.imageSignedUrl}
            alt={product.name}
            fill
            className="object-cover"
            sizes="(max-width: 768px) 50vw, 33vw"
            loading={imagePriority ? "eager" : "lazy"}
            priority={imagePriority}
            fetchPriority={imagePriority ? "high" : "low"}
            unoptimized
          />
        ) : (
          <div className="flex h-full items-center justify-center text-sm text-[#233d4d]">
            Sem imagem
          </div>
        )}
      </div>
      <div className="flex flex-1 flex-col gap-2 p-3">
        <h3 className="font-medium leading-tight text-[#233d4d]">
          {product.name}
        </h3>
        <p className="text-sm text-[#233d4d]">
          {Number(product.price).toLocaleString("pt-BR", {
            style: "currency",
            currency: "BRL",
          })}
        </p>
        <p className="text-xs text-[#233d4d]">Estoque: {stock}</p>

        {msg ? (
          <p className="text-xs text-amber-300" role="alert">
            {msg}
          </p>
        ) : null}

        <div className="mt-auto flex items-center gap-2">
          <button
            type="button"
            className="rounded-lg bg-slate-700 px-3 py-2 text-lg leading-none text-white hover:bg-slate-600 disabled:opacity-40"
            disabled={qty <= 0}
            onClick={() => {
              setMsg(null);
              addOrIncrement(product, -1);
            }}
            aria-label="Diminuir"
          >
            −
          </button>
          <span className="min-w-[2ch] text-center font-mono text-lg text-[#233d4d]">{qty}</span>
          <button
            type="button"
            className="rounded-lg bg-emerald-600 px-3 py-2 text-lg leading-none text-white hover:bg-emerald-500 disabled:opacity-40"
            disabled={!canAdd}
            onClick={() => {
              if (qty + 1 > stock) {
                setMsg(`Estoque insuficiente (Saldo: ${stock})`);
                return;
              }
              setMsg(null);
              addOrIncrement(product, 1);
            }}
            aria-label="Aumentar"
          >
            +
          </button>
        </div>
      </div>
    </article>
  );
}
