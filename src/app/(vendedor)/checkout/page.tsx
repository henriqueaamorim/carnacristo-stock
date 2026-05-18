"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import { useCallback, useState } from "react";
import { PaymentMethodSelector } from "@/components/PaymentMethodSelector";
import { QRCodeModal } from "@/components/QRCodeModal";
import type { PaymentMethod } from "@/types";
import { cartLinesToPayload, cartTotal, useCartStore } from "@/store/cartStore";

export default function CheckoutPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const orderTitle = useCartStore((s) => s.orderTitle);
  const lines = useCartStore((s) => s.lines);
  const clear = useCartStore((s) => s.clear);

  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod | null>(
    null,
  );
  const [pixOpen, setPixOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const submitOrder = useCallback(async () => {
    if (!paymentMethod) {
      setErr("Selecione a forma de pagamento.");
      return;
    }
    setBusy(true);
    setErr(null);
    try {
      const res = await fetch("/api/pedidos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: orderTitle,
          paymentMethod,
          items: cartLinesToPayload(lines),
        }),
      });
      const body = (await res.json().catch(() => ({}))) as {
        error?: string;
        order_id_display?: string;
        total_amount?: number | string;
      };
      if (!res.ok) {
        setErr(body.error || "Não foi possível finalizar o pedido.");
        return;
      }
      await queryClient.invalidateQueries({ queryKey: ["products"] });
      const display = String(body.order_id_display ?? "");
      const total = Number(body.total_amount ?? 0);
      clear();
      router.push(
        `/sucesso?display=${encodeURIComponent(display)}&total=${encodeURIComponent(String(total))}&method=${encodeURIComponent(paymentMethod)}`,
      );
    } finally {
      setBusy(false);
    }
  }, [paymentMethod, orderTitle, lines, clear, router, queryClient]);

  function onFinalizar() {
    setErr(null);
    if (!orderTitle.trim()) {
      setErr("Informe o título do pedido na etapa anterior.");
      return;
    }
    if (lines.length === 0) {
      setErr("Adicione ao menos um item.");
      return;
    }
    if (!paymentMethod) {
      setErr("Selecione a forma de pagamento.");
      return;
    }
    if (paymentMethod === "pix") {
      setPixOpen(true);
      return;
    }
    void submitOrder();
  }

  async function onPixModalClose() {
    setPixOpen(false);
    await submitOrder();
  }

  const total = cartTotal(lines);

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-semibold text-[#233d4d]">Checkout</h1>

      <section className="rounded-xl border border-slate-700 bg-orange-200/50 p-4">
        <h2 className="mb-2 text-sm font-medium text-[#233d4d]">Resumo</h2>
        <p className="text-sm text-[#233d4d]">
          Título: <span className="font-medium">{orderTitle || "—"}</span>
        </p>
        <p className="mt-2 text-lg font-semibold text-[#233d4d]">
          Total:{" "}
          {total.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
        </p>
        <ul className="mt-3 space-y-1 text-sm text-[#233d4d]">
          {lines.map((l) => (
            <li key={l.productId}>
              {l.name} × {l.quantity}
            </li>
          ))}
        </ul>
      </section>

      <PaymentMethodSelector value={paymentMethod} onChange={setPaymentMethod} />

      {err ? (
        <p className="text-sm text-red-400" role="alert">
          {err}
        </p>
      ) : null}

      <div className="flex flex-col gap-3 sm:flex-row">
        <Link
          href="/novo-pedido"
          className="rounded-lg border border-slate-600 px-4 py-3 text-center text-[#233d4d] hover:bg-orange-200"
        >
          Voltar
        </Link>
        <button
          type="button"
          disabled={busy}
          onClick={onFinalizar}
          className="flex-1 rounded-lg bg-emerald-600 py-3 font-medium text-white hover:bg-emerald-500 disabled:opacity-50"
        >
          {busy ? "Processando…" : "Finalizar pedido"}
        </button>
      </div>

      <QRCodeModal open={pixOpen} onClose={() => void onPixModalClose()} />
    </div>
  );
}
