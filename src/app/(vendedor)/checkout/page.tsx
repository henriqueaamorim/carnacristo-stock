"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import { useCallback, useEffect, useState } from "react";
import { PaymentMethodSelector } from "@/components/PaymentMethodSelector";
import { QRCodeModal } from "@/components/QRCodeModal";
import { SaleConfirmModal } from "@/components/SaleConfirmModal";
import type { PaymentMethod } from "@/types";
import { cartLinesToPayload, cartTotal, useCartStore } from "@/store/cartStore";
import { validateOrderTitle } from "@/utils/validation";

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
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    const titleResult = validateOrderTitle(orderTitle);
    if (!titleResult.ok) {
      router.replace("/novo-pedido");
    }
  }, [orderTitle, router]);

  const submitOrder = useCallback(async () => {
    if (!paymentMethod) {
      setErr("Selecione a forma de pagamento.");
      return;
    }
    setBusy(true);
    setErr(null);
    try {
      const titleResult = validateOrderTitle(orderTitle);
      if (!titleResult.ok) {
        setErr(titleResult.message);
        return;
      }

      const res = await fetch("/api/pedidos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: titleResult.value,
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

    const titleResult = validateOrderTitle(orderTitle);
    if (!titleResult.ok) {
      setErr(titleResult.message);
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
    setConfirmOpen(true);
  }

  function onConfirmSale() {
    setConfirmOpen(false);
    void submitOrder();
  }

  function onConfirmBack() {
    setConfirmOpen(false);
  }

  function onPixPaid() {
    setPixOpen(false);
    void submitOrder();
  }

  function onPixBack() {
    setPixOpen(false);
  }

  const total = cartTotal(lines);
  const titleResult = validateOrderTitle(orderTitle);
  const displayTitle = titleResult.ok ? titleResult.value : "—";

  return (
    <div className="space-y-6">
      <h1 className="text-base font-black text-black">Checkout</h1>

      <section className="overflow-hidden rounded-[1.4rem] border-2 border-black bg-[#eab660] shadow-[6px_6px_0_#000]">
        <div className="border-b-2 border-black bg-[#ea5342] px-4 py-3">
          <h2 className="text-sm font-black uppercase tracking-wide text-black">Resumo</h2>
        </div>
        <div className="p-4">
        <p className="text-lg font-black text-black">
          Título: <span className="font-black">{displayTitle}</span>
        </p>

        <ol className="mt-3 list-inside list-decimal space-y-1 pl-4 text-sm font-black text-black">
          {lines.map((l) => (
            <li key={l.productId}>
              {l.name} × {l.quantity}
            </li>
          ))}
        </ol>

        <p className="mt-2 text-lg font-black text-black">
          Total:{" "}
          {total.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
        </p>
        </div>
      </section>

      <PaymentMethodSelector value={paymentMethod} onChange={setPaymentMethod} />

      {err ? (
        <p
          className="rounded-lg border-2 border-red-600 bg-red-50 px-4 py-3 text-sm font-semibold text-red-900 shadow-sm"
          role="alert"
        >
          {err}
        </p>
      ) : null}

      <div className="flex flex-col gap-3 sm:flex-row">
        <Link
          href="/novo-pedido"
          className="rounded-lg border-2 border-black bg-[#fff4e8] px-4 py-3 text-center font-black text-black"
        >
          Voltar
        </Link>
        <button
          type="button"
          disabled={busy}
          onClick={onFinalizar}
          className="flex-1 rounded-lg border-2 border-black bg-[#abcf85] py-3 font-black text-black hover:bg-emerald-500 disabled:opacity-50"
        >
          {busy ? "Processando…" : "Finalizar pedido"}
        </button>
      </div>

      <QRCodeModal
        open={pixOpen}
        onPaid={onPixPaid}
        onBack={onPixBack}
        busy={busy}
      />

      {paymentMethod && paymentMethod !== "pix" ? (
        <SaleConfirmModal
          open={confirmOpen}
          onConfirm={onConfirmSale}
          onBack={onConfirmBack}
          busy={busy}
          title={displayTitle}
          lines={lines}
          total={total}
          paymentMethod={paymentMethod}
        />
      ) : null}
    </div>
  );
}
