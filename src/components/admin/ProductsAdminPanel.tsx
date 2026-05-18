"use client";

import Image from "next/image";
import { useCallback, useEffect, useState } from "react";
import type { ProductDTO } from "@/types";

/** Textos do cadastro (novo produto) — edite aqui */
const CREATE_SUCCESS_MSG = "✅ Produto cadastrado com sucesso!";
const CREATE_ERROR_FALLBACK = "❌ Não foi possível cadastrar o produto. Tente novamente.";

const UPDATE_SUCCESS_MSG = "Produto atualizado.";
const DELETE_SUCCESS_MSG = "Produto excluído.";

export function ProductsAdminPanel() {
  const [products, setProducts] = useState<ProductDTO[]>([]);
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [editing, setEditing] = useState<ProductDTO | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setErr(null);
    try {
      const res = await fetch("/api/produtos");
      const body = (await res.json().catch(() => ({}))) as
        | ProductDTO[]
        | { error?: string };
      if (!res.ok) {
        setErr((body as { error?: string }).error || "Erro ao listar");
        return;
      }
      setProducts(body as ProductDTO[]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function onCreate(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    setMsg(null);
    setErr(null);
    setBusy(true);
    const fd = new FormData(form);
    try {
      const res = await fetch("/api/produtos", { method: "POST", body: fd });
      const body = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) {
        setErr(body.error ? `❌ ${body.error}` : CREATE_ERROR_FALLBACK);
        return;
      }
      setMsg(CREATE_SUCCESS_MSG);
      form.reset();
      await load();
    } finally {
      setBusy(false);
    }
  }

  async function onUpdate(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!editing) return;
    setMsg(null);
    setErr(null);
    setBusy(true);
    const fd = new FormData(e.currentTarget);
    try {
      const res = await fetch(`/api/produtos/${editing.id}`, {
        method: "PATCH",
        body: fd,
      });
      const body = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) {
        setErr(body.error ? `❌ ${body.error}` : "❌ Não foi possível atualizar o produto. Tente novamente.");
        return;
      }
      setMsg(UPDATE_SUCCESS_MSG);
      setEditing(null);
      await load();
    } finally {
      setBusy(false);
    }
  }

  async function onDelete(row: ProductDTO) {
    if (
      !confirm(
        `Excluir o produto "${row.name}"? Esta ação não pode ser desfeita.`,
      )
    )
      return;
    setMsg(null);
    setErr(null);
    setBusy(true);
    try {
      const res = await fetch(`/api/produtos/${row.id}`, { method: "DELETE" });
      const body = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) {
        setErr(body.error || "Erro ao excluir produto");
        return;
      }
      setMsg(DELETE_SUCCESS_MSG);
      if (editing?.id === row.id) setEditing(null);
      await load();
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-10">
      <section>
        <h2 className="mb-4 text-lg font-medium text-[#233d4d]">Novo produto</h2>
        <form
          onSubmit={onCreate}
          className="grid gap-4 rounded-xl border border-slate-700 bg-orange-200/50 p-6 sm:grid-cols-2"
        >
          <label className="block text-sm text-[#233d4d] sm:col-span-2">
            Nome
            <input
              name="name"
              required
              className="mt-1 w-full rounded-lg border border-slate-600 bg-orange-200 px-3 py-2 text-[#233d4d]"
            />
          </label>
          <label className="block text-sm text-[#233d4d] sm:col-span-2">
            Descrição
            <textarea
              name="description"
              rows={2}
              className="mt-1 w-full rounded-lg border border-slate-600 bg-orange-200 px-3 py-2 text-[#233d4d]"
            />
          </label>
          <label className="block text-sm text-[#233d4d]">
            Preço (R$)
            <input
              name="price"
              type="number"
              step="0.01"
              min="0.01"
              required
              className="mt-1 w-full rounded-lg border border-slate-600 bg-orange-200 px-3 py-2 text-[#233d4d]"
            />
          </label>
          <label className="block text-sm text-[#233d4d]">
            Estoque
            <input
              name="stock_quantity"
              type="number"
              min="0"
              step="1"
              required
              className="mt-1 w-full rounded-lg border border-slate-600 bg-orange-200 px-3 py-2 text-[#233d4d]"
            />
          </label>
          <label className="block text-sm text-[#233d4d] sm:col-span-2">
            Imagem (opcional, até 5MB)
            <input
              name="file"
              type="file"
              accept="image/png,image/jpeg,image/webp"
              className="mt-1 w-full rounded-md border-2 border-black p-2.5 text-sm text-[#233d4d]"
            />
          </label>
          <button
            type="submit"
            disabled={busy}
            className="sm:col-span-2 rounded-lg bg-emerald-600 py-2 font-medium text-white hover:bg-emerald-500 disabled:opacity-50"
          >
            {busy ? "Salvando…" : "Cadastrar produto"}
          </button>
        </form>
      </section>

      {msg ? (
        <p
          className="rounded-lg border-2 border-emerald-600 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-900 shadow-sm"
          role="status"
        >
          {msg}
        </p>
      ) : null}
      {err ? (
        <p
          className="rounded-lg border-2 border-red-600 bg-red-50 px-4 py-3 text-sm font-semibold text-red-900 shadow-sm"
          role="alert"
        >
          {err}
        </p>
      ) : null}

      <section>
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-lg font-medium text-[#233d4d]">Catálogo</h2>
          <button
            type="button"
            disabled={loading || busy}
            onClick={() => void load()}
            className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-500 disabled:opacity-50"
          >
            {loading ? "Atualizando…" : "Atualizar lista"}
          </button>
        </div>
        {loading ? (
          <p className="text-[#233d4d]">Carregando…</p>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-slate-700">
            <table className="min-w-full text-left text-sm text-[#233d4d]">
              <thead className="border-b border-slate-700 bg-orange-200">
                <tr>
                  <th className="p-3">Foto</th>
                  <th className="p-3">Nome</th>
                  <th className="p-3">Preço</th>
                  <th className="p-3">Estoque</th>
                  <th className="p-3 text-right">Ações</th>
                </tr>
              </thead>
              <tbody>
                {products.map((p, idx) => (
                  <tr key={p.id} className="border-b border-slate-800">
                    <td className="p-2">
                      <div className="relative h-14 w-14 overflow-hidden rounded bg-slate-800">
                        {p.imageSignedUrl ? (
                          <Image
                            src={p.imageSignedUrl}
                            alt=""
                            fill
                            className="object-cover"
                            sizes="56px"
                            loading={idx < 8 ? "eager" : "lazy"}
                            priority={idx < 4}
                            unoptimized
                          />
                        ) : null}
                      </div>
                    </td>
                    <td className="p-3 font-medium">{p.name}</td>
                    <td className="p-3">
                      {Number(p.price).toLocaleString("pt-BR", {
                        style: "currency",
                        currency: "BRL",
                      })}
                    </td>
                    <td className="p-3 font-mono">{p.stock_quantity}</td>
                    <td className="p-3 text-right">
                      <button
                        type="button"
                        disabled={busy}
                        className="mr-2 text-emerald-400 hover:underline disabled:opacity-50"
                        onClick={() => {
                          setEditing(p);
                          setMsg(null);
                          setErr(null);
                        }}
                      >
                        Editar
                      </button>
                      <button
                        type="button"
                        disabled={busy}
                        className="text-red-400 hover:underline disabled:opacity-50"
                        onClick={() => void onDelete(p)}
                      >
                        Excluir
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {editing ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"
          role="presentation"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) setEditing(null);
          }}
        >
          <div
            className="w-full max-w-lg rounded-xl border border-slate-600 bg-slate-950 p-6 shadow-xl"
            role="dialog"
            aria-modal="true"
            aria-labelledby="edit-product-title"
          >
            <h3 id="edit-product-title" className="mb-4 text-lg font-semibold text-white">
              Editar produto
            </h3>
            <form onSubmit={onUpdate} className="space-y-3">
              <label className="block text-sm text-slate-300">
                Nome
                <input
                  name="name"
                  required
                  defaultValue={editing.name}
                  className="mt-1 w-full rounded-lg border border-slate-600 bg-slate-900 px-3 py-2 text-white"
                />
              </label>
              <label className="block text-sm text-slate-300">
                Descrição
                <textarea
                  name="description"
                  rows={2}
                  defaultValue={editing.description ?? ""}
                  className="mt-1 w-full rounded-lg border border-slate-600 bg-slate-900 px-3 py-2 text-white"
                />
              </label>
              <label className="block text-sm text-slate-300">
                Preço
                <input
                  name="price"
                  type="number"
                  step="0.01"
                  min="0.01"
                  required
                  defaultValue={editing.price}
                  className="mt-1 w-full rounded-lg border border-slate-600 bg-slate-900 px-3 py-2 text-white"
                />
              </label>
              <label className="block text-sm text-slate-300">
                Estoque
                <input
                  name="stock_quantity"
                  type="number"
                  min="0"
                  required
                  defaultValue={editing.stock_quantity}
                  className="mt-1 w-full rounded-lg border border-slate-600 bg-slate-900 px-3 py-2 text-white"
                />
              </label>
              <label className="block text-sm text-slate-300">
                Nova imagem (opcional)
                <input
                  name="file"
                  type="file"
                  accept="image/png,image/jpeg,image/webp"
                  className="mt-1 w-full text-sm"
                />
              </label>
              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  disabled={busy}
                  className="flex-1 rounded-lg border border-slate-600 py-2 text-slate-200 disabled:opacity-50"
                  onClick={() => setEditing(null)}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={busy}
                  className="flex-1 rounded-lg bg-emerald-600 py-2 font-medium text-white disabled:opacity-50"
                >
                  {busy ? "Salvando…" : "Salvar"}
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </div>
  );
}
