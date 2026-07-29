"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import { useCallback, useEffect, useState } from "react";
import { BrlPriceInput } from "@/components/BrlPriceInput";
import { OfflineBanner } from "@/components/OfflineBanner";
import { PaymentMethodSelector } from "@/components/PaymentMethodSelector";
import { QRCodeModal } from "@/components/QRCodeModal";
import { SaleConfirmModal } from "@/components/SaleConfirmModal";
import { useOnlineStatus } from "@/hooks/useOnlineStatus";
import type { PaymentMethod } from "@/types";
import { cartLinesToPayload, cartTotal, useCartStore } from "@/store/cartStore";
import { isNetworkError } from "@/utils/network";
import { validateOrderTitle } from "@/utils/validation";

export default function CheckoutPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const online = useOnlineStatus();
  const orderTitle = useCartStore((s) => s.orderTitle);
  const lines = useCartStore((s) => s.lines);
  const clear = useCartStore((s) => s.clear);

  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod | null>(
    null,
  );
  const [pixOpen, setPixOpen] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [deferredOpen, setDeferredOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const [partialMode, setPartialMode] = useState(false);
  const [partialPaymentMethod, setPartialPaymentMethod] =
    useState<PaymentMethod | null>(null);
  const [partialAmount, setPartialAmount] = useState<number | null>(null);
  const [partialConfirmOpen, setPartialConfirmOpen] = useState(false);

  useEffect(() => {
    const titleResult = validateOrderTitle(orderTitle);
    if (!titleResult.ok) {
      router.replace("/novo-pedido");
    }
  }, [orderTitle, router]);

  const submitOrder = useCallback(
    async (
      opts: {
        deferred?: boolean;
        partialAmount?: number;
        partialPaymentMethod?: PaymentMethod;
      } = {},
    ) => {
      const deferred = opts.deferred === true;
      const isPartial = opts.partialAmount != null;
      const effectiveMethod = isPartial ? opts.partialPaymentMethod! : paymentMethod;
      if (!deferred && !effectiveMethod) {
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
            ...(deferred
              ? { deferredPayment: true }
              : isPartial
                ? { paymentMethod: effectiveMethod, partialAmount: opts.partialAmount }
                : { paymentMethod: effectiveMethod }),
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
        if (isPartial) {
          router.push(
            `/sucesso?display=${encodeURIComponent(display)}&total=${encodeURIComponent(String(total))}&pending=1&partial=1&paid=${encodeURIComponent(String(opts.partialAmount))}&method=${encodeURIComponent(effectiveMethod!)}`,
          );
        } else if (deferred) {
          router.push(
            `/sucesso?display=${encodeURIComponent(display)}&total=${encodeURIComponent(String(total))}&pending=1`,
          );
        } else {
          router.push(
            `/sucesso?display=${encodeURIComponent(display)}&total=${encodeURIComponent(String(total))}&method=${encodeURIComponent(effectiveMethod!)}`,
          );
        }
      } catch (e) {
        setErr(
          isNetworkError(e)
            ? "Sem conexão. O pedido não foi enviado — verifique sua internet e tente novamente."
            : "Erro inesperado ao finalizar o pedido. Tente novamente.",
        );
      } finally {
        setBusy(false);
      }
    },
    [paymentMethod, orderTitle, lines, clear, router, queryClient],
  );

  function validateCheckout(): boolean {
    setErr(null);

    const titleResult = validateOrderTitle(orderTitle);
    if (!titleResult.ok) {
      setErr(titleResult.message);
      return false;
    }

    if (lines.length === 0) {
      setErr("Adicione ao menos um item.");
      return false;
    }

    return true;
  }

  function onFinalizar() {
    if (!validateCheckout()) return;
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

  function onSalvarPendente() {
    if (!validateCheckout()) return;
    setDeferredOpen(true);
  }

  function onConfirmSale() {
    setConfirmOpen(false);
    void submitOrder();
  }

  function onConfirmBack() {
    setConfirmOpen(false);
  }

  function onConfirmDeferred() {
    setDeferredOpen(false);
    void submitOrder({ deferred: true });
  }

  function onDeferredBack() {
    setDeferredOpen(false);
  }

  function onPixPaid() {
    setPixOpen(false);
    void submitOrder();
  }

  function onPixBack() {
    setPixOpen(false);
  }

  function onTogglePartialMode() {
    setErr(null);
    setPartialMode((v) => !v);
  }

  function onFinalizarParcial() {
    if (!validateCheckout()) return;
    if (!partialPaymentMethod) {
      setErr("Selecione a forma de pagamento do valor parcial.");
      return;
    }
    if (partialAmount == null || partialAmount <= 0) {
      setErr("Informe o valor pago pelo cliente.");
      return;
    }
    if (partialAmount >= total) {
      setErr("O valor parcial deve ser menor que o total do pedido.");
      return;
    }
    setPartialConfirmOpen(true);
  }

  function onConfirmPartial() {
    setPartialConfirmOpen(false);
    void submitOrder({
      partialAmount: partialAmount!,
      partialPaymentMethod: partialPaymentMethod!,
    });
  }

  function onPartialConfirmBack() {
    setPartialConfirmOpen(false);
  }

  const total = cartTotal(lines);
  const remainingPartial =
    partialAmount != null ? Math.max(0, total - partialAmount) : null;
  const titleResult = validateOrderTitle(orderTitle);
  const displayTitle = titleResult.ok ? titleResult.value : "—";

  return (
    <div className="space-y-6">
      <h1 className="text-base font-black text-black">Checkout</h1>

      {!online ? (
        <OfflineBanner message="Sem conexão com a internet. Não é possível finalizar ou salvar o pedido até a conexão voltar." />
      ) : null}

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

      <section className="overflow-hidden rounded-[1.4rem] border-2 border-black bg-[#eab660] shadow-[6px_6px_0_#000]">
        <button
          type="button"
          onClick={onTogglePartialMode}
          className="flex w-full items-center justify-between border-b-2 border-black bg-[#ea5342] px-4 py-3 text-left"
        >
          <span className="text-sm font-black uppercase tracking-wide text-black">
            Pagamento parcial
          </span>
          <span className="text-xs font-black text-black">
            {partialMode ? "Ocultar" : "Usar"}
          </span>
        </button>
        {partialMode ? (
          <div className="space-y-4 p-4">
            <p className="text-xs font-semibold text-[#233d4d]">
              Informe quanto o cliente vai pagar agora. O restante fica
              pendente e pode ser complementado depois.
            </p>
            <label className="block text-sm font-black text-black">
              Valor pago agora
              <BrlPriceInput
                name="partialAmount"
                onAmountChange={setPartialAmount}
                className="mt-1 w-full rounded-lg border-2 border-black bg-[#fff4e8] px-3 py-2 text-[#233d4d]"
              />
            </label>
            {remainingPartial != null ? (
              <p className="text-sm font-black text-black">
                Restante:{" "}
                {remainingPartial.toLocaleString("pt-BR", {
                  style: "currency",
                  currency: "BRL",
                })}
              </p>
            ) : null}
            <PaymentMethodSelector
              value={partialPaymentMethod}
              onChange={setPartialPaymentMethod}
            />
            <button
              type="button"
              disabled={busy || !online}
              onClick={onFinalizarParcial}
              className="w-full rounded-lg border-2 border-black bg-[#abcf85] py-3 font-black text-black hover:bg-emerald-500 disabled:opacity-50"
            >
              {busy ? "Processando…" : "Registrar pagamento parcial"}
            </button>
          </div>
        ) : null}
      </section>

      {err ? (
        <p
          className="rounded-lg border-2 border-red-600 bg-red-50 px-4 py-3 text-sm font-semibold text-red-900 shadow-sm"
          role="alert"
        >
          {err}
        </p>
      ) : null}

      <div className="flex flex-col gap-3">
        <div className="flex flex-col gap-3 sm:flex-row">
          <Link
            href="/novo-pedido"
            className="rounded-lg border-2 border-black bg-[#fff4e8] px-4 py-3 text-center font-black text-black"
          >
            Voltar
          </Link>
          <button
            type="button"
            disabled={busy || !online}
            onClick={onFinalizar}
            className="flex-1 rounded-lg border-2 border-black bg-[#abcf85] py-3 font-black text-black hover:bg-emerald-500 disabled:opacity-50"
          >
            {busy ? "Processando…" : "Finalizar pedido"}
          </button>
        </div>
        <button
          type="button"
          disabled={busy || !online}
          onClick={onSalvarPendente}
          className="rounded-lg border-2 border-black bg-[#fff4e8] py-3 font-black text-black hover:bg-[#f8e8d8] disabled:opacity-50"
        >
          Salvar pendente de pagamento
        </button>
        <p className="text-center text-xs font-semibold text-[#233d4d]">
          O pagamento será registrado depois pelo administrador.
        </p>
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

      <SaleConfirmModal
        open={deferredOpen}
        onConfirm={onConfirmDeferred}
        onBack={onDeferredBack}
        busy={busy}
        title={displayTitle}
        lines={lines}
        total={total}
        showPayment={false}
      />

      {partialPaymentMethod ? (
        <SaleConfirmModal
          open={partialConfirmOpen}
          onConfirm={onConfirmPartial}
          onBack={onPartialConfirmBack}
          busy={busy}
          title={displayTitle}
          lines={lines}
          total={total}
          paymentMethod={partialPaymentMethod}
          partialAmount={partialAmount ?? 0}
        />
      ) : null}
    </div>
  );
}
