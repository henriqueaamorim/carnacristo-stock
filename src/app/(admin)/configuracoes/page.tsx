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
      <h1 className="text-xl font-semibold text-[#233d4d]">Configurações — PIX</h1>

      {preview ? (
        <div className="rounded-xl border border-slate-700 bg-orange-200/50 p-4">
          <p className="mb-2 text-sm text-[#233d4d]">QR atual</p>
          <div className="relative mx-auto h-48 w-48 bg-white p-2">
            <Image src={preview} alt="Preview QR PIX" fill className="object-contain" unoptimized />
          </div>
        </div>
      ) : null}

      <form
        onSubmit={onSubmit}
        className="space-y-4 rounded-xl border border-slate-700 bg-orange-200/50 p-6"
      >
        <label className="block text-sm text-[#233d4d]">
          Nova imagem do QR Code (PNG/JPG, máx. 2MB)
          <input
            name="file"
            type="file"
            accept="image/png,image/jpeg,image/webp"
            required
            className="mt-1 w-full rounded-lg border border-slate-600 bg-orange-200 px-3 py-2 text-sm text-[#233d4d]"
          />
        </label>
        <label className="block text-sm text-[#233d4d]">
          Descrição da chave (ex.: CPF)
          <input
            name="description"
            value={desc}
            onChange={(e) => setDesc(e.target.value)}
            className="mt-1 w-full rounded-lg border border-slate-600 bg-orange-200 px-3 py-2 text-[#233d4d]"
            placeholder="123.456.789-00"
          />
        </label>
        {err ? (
          <p className="text-sm text-red-400" role="alert">
            {err}
          </p>
        ) : null}
        {msg ? (
          <p className="text-sm text-[#233d4d]" role="status">
            {msg}
          </p>
        ) : null}
        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-lg bg-emerald-600 py-2 font-medium text-white hover:bg-emerald-500 disabled:opacity-50"
        >
          {loading ? "Salvando…" : "Salvar configuração"}
        </button>
      </form>
    </div>
  );
}
