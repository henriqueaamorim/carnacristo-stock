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
    <article className="flex flex-col overflow-hidden rounded-[1.2rem] border-2 border-black bg-[#eab660] shadow-[5px_5px_0_#000]">
      <div className="relative aspect-square w-full border-b-2 border-black bg-[#fff4e8]">
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
        <h3 className="font-black leading-tight text-black">
          {product.name}
        </h3>
        <p className="text-sm font-black text-[#233d4d]">
          {Number(product.price).toLocaleString("pt-BR", {
            style: "currency",
            currency: "BRL",
          })}
        </p>
        <p className="text-xs font-semibold text-[#233d4d]">Estoque: {stock}</p>

        {msg ? (
          <p
            className="rounded border-2 border-black bg-[#f7b3a9] px-2 py-1 text-xs font-semibold text-black"
            role="alert"
          >
            {msg}
          </p>
        ) : null}

        <div className="mt-auto flex items-center gap-2">
          <button
            type="button"
            className="rounded-lg border-2 border-black bg-[#fff4e8] px-3 py-2 text-lg leading-none text-black disabled:opacity-40"
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
            className="rounded-lg border-2 border-black bg-[#abcf85] px-3 py-2 text-lg leading-none text-black hover:bg-emerald-500 disabled:opacity-40"
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
