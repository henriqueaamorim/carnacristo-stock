"use client";

import { useEffect, useRef, useState } from "react";

type PixPayload = {
  configured: boolean;
  signedUrl: string | null;
  description: string | null;
};

type Props = {
  open: boolean;
  onPaid: () => void;
  onBack: () => void;
  busy?: boolean;
};

export function QRCodeModal({ open, onPaid, onBack, busy = false }: Props) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const backBtnRef = useRef<HTMLButtonElement>(null);
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<PixPayload | null>(null);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    setLoading(true);
    setErr(null);
    setData(null);
    void fetch("/api/configuracoes/qrcode")
      .then(async (r) => {
        if (!r.ok) {
          const j = (await r.json().catch(() => ({}))) as { error?: string };
          throw new Error(j.error || "Erro ao carregar PIX");
        }
        return r.json() as Promise<PixPayload>;
      })
      .then((j) => {
        if (!cancelled) setData(j);
      })
      .catch((e: Error) => {
        if (!cancelled) setErr(e.message);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [open]);

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

  const hasDesc = Boolean(data?.description);

  return (
    <dialog
      ref={dialogRef}
      className="fixed inset-0 z-50 m-0 h-full max-h-none w-full max-w-none border-0 bg-black/90 p-4 backdrop:bg-black/80"
      aria-labelledby="pix-dialog-title"
      aria-describedby={hasDesc ? "pix-description" : undefined}
      aria-modal="true"
      onCancel={(e) => {
        e.preventDefault();
        onBack();
      }}
    >
      <div className="mx-auto flex h-full w-full max-w-md flex-col justify-center">
        <div className="overflow-hidden rounded-[1.4rem] border-2 border-black bg-[#eab660] shadow-[6px_6px_0_#000]">
          <div className="flex items-center justify-between border-b-2 border-black bg-[#ea5342] px-4 py-3">
            <h2 id="pix-dialog-title" className="text-sm font-black uppercase tracking-wide text-black">
              Pagamento PIX
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

        {loading && (
          <p className="text-center py-4 text-lg text-center font-black text-black" role="status">
            Carregando QR Code…
          </p>
        )}

        {!loading && err && (
          <p className="rounded-lg border-2 border-red-600 bg-red-50 px-4 py-3 text-center text-red-900" role="alert">
            {err}
          </p>
        )}

        {!loading && !err && data && !data.configured && (
          <p className="text-center text-[#233d4d]" role="alert">
            PIX ainda não configurado pelo administrador.
          </p>
        )}

        {!loading && data?.configured && data.signedUrl && (
          <>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={data.signedUrl}
              alt="QR Code para pagamento PIX"
              className="mx-auto mb-4 max-h-[55vh] w-auto rounded-lg border-2 border-black bg-white p-2 shadow-[4px_4px_0_#000]"
              loading="eager"
            />
            {data.description ? (
              <p
                id="pix-description"
                className="mb-6 text-lg text-center font-black text-black"
              >
                {data.description}
              </p>
            ) : null}
          </>
        )}

        <div className="mt-auto flex flex-col gap-3 sm:flex-row">
          <button
            type="button"
            onClick={onPaid}
            disabled={busy}
            aria-label="Confirmar pagamento PIX e concluir pedido"
            className="flex-1 rounded-lg border-2 border-black bg-[#abcf85] py-3 font-black text-black hover:bg-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-400 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {busy ? "Processando…" : "Pago"}
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
