"use client";

import { useEffect, useRef, useState } from "react";

type PixPayload = {
  configured: boolean;
  signedUrl: string | null;
  description: string | null;
};

type Props = {
  open: boolean;
  onClose: () => void;
};

export function QRCodeModal({ open, onClose }: Props) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const closeBtnRef = useRef<HTMLButtonElement>(null);
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
      queueMicrotask(() => closeBtnRef.current?.focus());

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
        onClose();
      }}
    >
      <div className="mx-auto flex h-full w-full max-w-md flex-col justify-center rounded-xl bg-orange-200/50 p-6">
        <h2 id="pix-dialog-title" className="mb-4 text-center text-xl font-semibold text-[#233d4d]">
          Pagamento PIX
        </h2>

        {loading && (
          <p className="text-center text-[#233d4d]" role="status">
            Carregando QR Code…
          </p>
        )}

        {!loading && err && (
          <p className="text-center text-red-400" role="alert">
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
              className="mx-auto mb-4 max-h-[55vh] w-auto rounded-lg bg-white p-2"
              loading="eager"
            />
            {data.description ? (
              <p
                id="pix-description"
                className="mb-6 text-center text-sm text-[#233d4d]"
              >
                {data.description}
              </p>
            ) : null}
          </>
        )}

        <button
          ref={closeBtnRef}
          type="button"
          onClick={onClose}
          className="mt-auto w-full rounded-lg bg-emerald-600 py-3 font-medium text-white hover:bg-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-400"
        >
          Fechar
        </button>
      </div>
    </dialog>
  );
}
