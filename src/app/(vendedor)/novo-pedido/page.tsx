"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { OfflineBanner } from "@/components/OfflineBanner";
import { ProductCard } from "@/components/ProductCard";
import { useOnlineStatus } from "@/hooks/useOnlineStatus";
import { useProducts } from "@/hooks/useProducts";
import { useCartStore } from "@/store/cartStore";
import {
  ORDER_TITLE_MIN_LENGTH,
  validateOrderTitle,
} from "@/utils/validation";

export default function NovoPedidoPage() {
  const router = useRouter();
  const online = useOnlineStatus();
  const { data: products, isLoading, error } = useProducts();
  const orderTitle = useCartStore((s) => s.orderTitle);
  const setOrderTitle = useCartStore((s) => s.setOrderTitle);
  const lines = useCartStore((s) => s.lines);
  const [localTitle, setLocalTitle] = useState(orderTitle);
  const [titleError, setTitleError] = useState<string | null>(null);

  function handleGoToCheckout() {
    if (lines.length === 0) return;

    const result = validateOrderTitle(localTitle);
    if (!result.ok) {
      setTitleError(result.message);
      return;
    }

    setTitleError(null);
    setOrderTitle(result.value);
    router.push("/checkout");
  }

  return (
    <div className="space-y-6">
      <h1 className="text-base font-black text-black">Novo pedido</h1>

      {!online ? (
        <OfflineBanner message="Sem conexão com a internet. Você pode navegar pelo catálogo, mas não é possível criar ou finalizar pedidos até a conexão voltar." />
      ) : null}

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
            Título do pedido (obrigatório)
            <input
              type="text"
              placeholder='Ex: "Maria do Rosario - Centro"'
              className="mt-1 w-full rounded-lg border-2 border-black bg-[#fff4e8] px-3 py-2 text-[#233d4d]"
              value={localTitle}
              minLength={ORDER_TITLE_MIN_LENGTH}
              aria-invalid={!!titleError}
              aria-describedby={
                titleError ? "order-title-error" : "order-title-hint"
              }
              onChange={(e) => {
                setLocalTitle(e.target.value);
                setOrderTitle(e.target.value);
                if (titleError) setTitleError(null);
              }}
            />
          </label>
          <p
            id="order-title-hint"
            className="mt-1 text-xs text-[#233d4d]"
          >
            Mínimo {ORDER_TITLE_MIN_LENGTH} caracteres.
          </p>
          {titleError ? (
            <p
              id="order-title-error"
              className="mt-2 rounded-lg border-2 border-red-600 bg-red-50 px-3 py-2 text-sm font-semibold text-red-900"
              role="alert"
            >
              {titleError}
            </p>
          ) : null}
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
        <button
          type="button"
          onClick={handleGoToCheckout}
          disabled={lines.length === 0}
          className={`inline-flex justify-center rounded-lg border-2 border-black px-4 py-3 text-center font-black ${
            lines.length === 0
              ? "cursor-not-allowed bg-slate-300 text-slate-600"
              : "bg-[#abcf85] text-black hover:bg-emerald-500"
          }`}
        >
          Ir para checkout
        </button>
      </div>
    </div>
  );
}
