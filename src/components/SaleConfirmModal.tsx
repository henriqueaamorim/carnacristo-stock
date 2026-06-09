"use client";

import { useEffect, useRef } from "react";
import type { CartLine } from "@/store/cartStore";
import type { PaymentMethod } from "@/types";
import { PAYMENT_METHOD_LABELS } from "@/utils/paymentMethod";

type Props = {
  open: boolean;
  onConfirm: () => void;
  onBack: () => void;
  busy?: boolean;
  title: string;
  lines: CartLine[];
  total: number;
  paymentMethod?: PaymentMethod;
  /** Quando false, confirma pedido pendente de pagamento (sem método). */
  showPayment?: boolean;
};

export function SaleConfirmModal({
  open,
  onConfirm,
  onBack,
  busy = false,
  title,
  lines,
  total,
  paymentMethod,
  showPayment = true,
}: Props) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const backBtnRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const el = dialogRef.current;
    if (!el) return;

    if (open) {
      if (!el.open) el.showModal();
      queueMicrotask(() => backBtnRef.current?.focus());

      const onKeyDown = (e: KeyboardEvent) => {
        if (e.key !== "Tab" || !dialogRef.current) return;
        const root = dialogRef.current;
        const focusables = root.querySelectorAll<HTMLElement>(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
        );
        const list = [...focusables].filter((n) => !n.hasAttribute("disabled"));
        if (list.length === 0) return;
        const first = list[0]!;
        const last = list[list.length - 1]!;
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      };

      el.addEventListener("keydown", onKeyDown);
      return () => el.removeEventListener("keydown", onKeyDown);
    }

    if (el.open) el.close();
    return undefined;
  }, [open]);

  const totalFmt = total.toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
  const paymentLabel =
    paymentMethod != null ? PAYMENT_METHOD_LABELS[paymentMethod] : null;
  const dialogTitle = showPayment ? "Confirmar venda" : "Pendente de pagamento";
  const confirmQuestion = showPayment
    ? "Confirmar venda deste pedido?"
    : "Salvar pedido sem pagamento agora?";
  const confirmHint = showPayment
    ? null
    : "O pagamento será registrado depois pelo administrador.";

  return (
    <dialog
      ref={dialogRef}
      className="fixed inset-0 z-50 m-0 h-full max-h-none w-full max-w-none border-0 bg-black/90 p-4 backdrop:bg-black/80"
      aria-labelledby="sale-confirm-dialog-title"
      aria-describedby="sale-confirm-description"
      aria-modal="true"
      onCancel={(e) => {
        e.preventDefault();
        onBack();
      }}
    >
      <div className="mx-auto flex h-full w-full max-w-md flex-col justify-center">
        <div className="overflow-hidden rounded-[1.4rem] border-2 border-black bg-[#eab660] shadow-[6px_6px_0_#000]">
          <div className="flex items-center justify-between border-b-2 border-black bg-[#ea5342] px-4 py-3">
            <h2
              id="sale-confirm-dialog-title"
              className="text-sm font-black uppercase tracking-wide text-black"
            >
              {dialogTitle}
            </h2>
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
          <div className="p-6">
            <p
              id="sale-confirm-description"
              className="mb-4 text-center text-sm font-black text-black"
            >
              {confirmQuestion}
            </p>
            {confirmHint ? (
              <p className="mb-4 text-center text-xs font-semibold text-[#233d4d]">
                {confirmHint}
              </p>
            ) : null}

            <p className="text-lg font-black text-black">
              Título: <span className="font-black">{title}</span>
            </p>

            <ol className="mt-3 list-inside list-decimal space-y-1 pl-4 text-sm font-black text-black">
              {lines.map((l) => (
                <li key={l.productId}>
                  {l.name} × {l.quantity}
                </li>
              ))}
            </ol>

            <p className="mt-2 text-lg font-black text-black">
              Total: <span className="font-black">{totalFmt}</span>
            </p>
            {showPayment && paymentLabel ? (
              <p className="mt-2 text-sm font-black text-[#233d4d]">
                Pagamento:{" "}
                <span className="text-black">{paymentLabel}</span>
              </p>
            ) : null}

            <div className="mt-6 flex flex-col gap-3 sm:flex-row">
              <button
                type="button"
                onClick={onConfirm}
                disabled={busy}
                aria-label={
                  showPayment
                    ? "Confirmar venda e concluir pedido"
                    : "Salvar pedido pendente de pagamento"
                }
                className="flex-1 rounded-lg border-2 border-black bg-[#abcf85] py-3 font-black text-black hover:bg-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-400 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {busy ? "Processando…" : showPayment ? "Confirmar" : "Salvar pendente"}
              </button>
              <button
                ref={backBtnRef}
                type="button"
                onClick={onBack}
                aria-label="Voltar ao checkout sem concluir o pedido"
                className="flex-1 rounded-lg border-2 border-black bg-[#fff4e8] py-3 font-black text-black hover:bg-[#f8e8d8] focus:outline-none focus:ring-2 focus:ring-amber-400"
              >
                Voltar
              </button>
            </div>
          </div>
        </div>
      </div>
    </dialog>
  );
}
