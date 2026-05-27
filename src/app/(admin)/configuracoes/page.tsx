"use client";

import { useEffect, useState } from "react";
import Image from "next/image";

export default function AdminConfiguracoesPage() {
  const [preview, setPreview] = useState<string | null>(null);
  const [desc, setDesc] = useState("");
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let cancelled = false;
    void fetch("/api/configuracoes/qrcode")
      .then((r) => r.json())
      .then((j: { signedUrl?: string | null; description?: string | null }) => {
        if (cancelled) return;
        if (j.signedUrl) setPreview(j.signedUrl);
        if (j.description) setDesc(j.description);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setMsg(null);
    setErr(null);
    setLoading(true);
    const fd = new FormData(e.currentTarget);
    fd.set("description", desc);
    try {
      const res = await fetch("/api/configuracoes/qrcode", {
        method: "PUT",
        body: fd,
      });
      const body = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) {
        setErr(body.error || "Erro ao salvar");
        return;
      }
      setMsg("Configuração PIX salva.");
      const r = await fetch("/api/configuracoes/qrcode");
      const j = (await r.json()) as { signedUrl?: string | null };
      if (j.signedUrl) setPreview(j.signedUrl);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto max-w-lg space-y-6">
      <h1 className="text-xl text-base font-black text-black">Configurações — PIX</h1>

      {preview ? (
        <div className="overflow-hidden rounded-[1.4rem] border-2 border-black bg-[#eab660] shadow-[6px_6px_0_#000]">
          <div className="border-b-2 border-black bg-[#ea5342] px-4 py-3">
            <p className="text-sm font-black uppercase tracking-wide text-black">QR atual</p>
          </div>
          <div className="p-4">
            <div className="relative mx-auto h-48 w-48 rounded-lg border-2 border-black bg-white p-2 shadow-[4px_4px_0_#000]">
              <Image src={preview} alt="Preview QR PIX" fill className="object-contain" unoptimized />
            </div>
          </div>
        </div>
      ) : null}

      <form
        onSubmit={onSubmit}
        className="overflow-hidden rounded-[1.4rem] border-2 border-black bg-[#eab660] shadow-[6px_6px_0_#000]"
      >
        <div className="flex items-center justify-between border-b-2 border-black bg-[#ea5342] px-4 py-3">
          <span className="text-sm font-black uppercase tracking-wide text-black">PIX</span>
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
        <div className="space-y-4 p-6">
          <label className="block text-base font-black text-black">
            Nova imagem do QR Code (PNG/JPG, máx. 2MB)
            <input
              name="file"
              type="file"
              accept="image/png,image/jpeg,image/webp"
              required
              className="mt-1 w-full rounded-lg border-2 border-black bg-[#fff4e8] px-3 py-2 text-sm text-[#233d4d]"
            />
          </label>
          <label className="block text-base font-black text-black">
            Descrição da chave (ex.: CPF)
            <input
              name="description"
              value={desc}
              onChange={(e) => setDesc(e.target.value)}
              className="mt-1 w-full rounded-lg border-2 border-black bg-[#fff4e8] px-3 py-2 text-[#233d4d]"
              placeholder="123.456.789-00"
            />
          </label>
          {err ? (
            <p
              className="rounded-lg border-2 border-red-600 bg-red-50 px-4 py-3 text-sm font-semibold text-red-900 shadow-sm"
              role="alert"
            >
              {err}
            </p>
          ) : null}
          {msg ? (
            <p
              className="rounded-lg border-2 border-emerald-600 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-900 shadow-sm"
              role="status"
            >
              {msg}
            </p>
          ) : null}
          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-lg border-2 border-black bg-[#abcf85] py-2 font-black text-black hover:bg-emerald-500 disabled:opacity-50"
          >
            {loading ? "Salvando…" : "Salvar configuração"}
          </button>
        </div>
      </form>
    </div>
  );
}
