"use client";

import Image from "next/image";
import { useCallback, useEffect, useState } from "react";
import { BrlPriceInput } from "@/components/BrlPriceInput";
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
  const [createFormKey, setCreateFormKey] = useState(0);

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
      setCreateFormKey((k) => k + 1);
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

  const [fileStatus, setFileStatus] = useState("Nenhuma imagem selecionada");

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    setFileStatus(file ? `Imagem selecionada: ${file.name}` : "Nenhuma imagem selecionada");
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
        <h2 className="mb-4 text-base font-medium text-black">Novo produto</h2>
        <form
          key={createFormKey}
          onSubmit={onCreate}
          className="grid gap-4 rounded-[1.4rem] border-2 border-black bg-[#eab660] p-6 sm:grid-cols-2 shadow-[6px_6px_0_#000]"
        >
          <label className="block text-base font-black text-black sm:col-span-2">
            Nome
            <input
              name="name"
              required
              className="mt-1 w-full rounded-lg border-2 border-black bg-[#fff4e8] px-3 py-2 text-[#233d4d]"
            />
          </label>
          <label className="block text-base font-black text-black sm:col-span-2">
            Descrição
            <textarea
              name="description"
              rows={2}
              className="mt-1 w-full rounded-lg border-2 border-black bg-[#fff4e8] px-3 py-2 text-[#233d4d]"
            />
          </label>
          <label className="block text-base font-black text-black">
            Preço
            <BrlPriceInput
              required
              className="mt-1 w-full rounded-lg border-2 border-black bg-[#fff4e8] px-3 py-2 text-[#233d4d]"
            />
          </label>
          <label className="block text-base font-black text-black">
            Estoque
            <input
              name="stock_quantity"
              type="number"
              min="0"
              step="1"
              required
              className="mt-1 w-full rounded-lg border-2 border-black bg-[#fff4e8] px-3 py-2 text-[#233d4d]"
            />
          </label>
          <label className="block text-base font-black text-black sm:col-span-2">
            Imagem (opcional, até 5MB)
            <input
              name="file"
              type="file"
              accept="image/png,image/jpeg,image/webp"
              onChange={handleFileChange}
            />
            <p className="mt-1 w-full rounded-lg border-2 border-black bg-[#fff4e8] p-2.5 text-sm text-[#233d4d]">
              {fileStatus}</p>
          </label>
          <button
            type="submit"
            disabled={busy}
            className="sm:col-span-2 rounded-lg border-2 border-black bg-[#abcf85] py-2 font-black text-black hover:bg-emerald-500 disabled:opacity-50"
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
          <h2 className="text-base font-medium text-black">Catálogo</h2>
          <button
            type="button"
            disabled={loading || busy}
            onClick={() => void load()}
            className="rounded-lg border-2 border-black bg-[#abcf85] py-2 px-4 font-black text-black hover:bg-emerald-500 disabled:opacity-50"
          >
            {loading ? "Atualizando…" : "Atualizar lista"}
          </button>
        </div>
        {loading ? (
          <p className="text-[#233d4d]">Carregando…</p>
        ) : (
          <div className="overflow-x-auto rounded-[1.4rem] border-2 border-black bg-[#eab660] shadow-[6px_6px_0_#000]">
            <table className="min-w-full text-left text-base font-black text-black">
              <thead className="border-b border-slate-700 bg-[#ea5342]">
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
                      <div className="relative rounded-lg border-2 border-black shadow-[2px_2px_0_#000] h-14 w-14 overflow-hidden bg-slate-800">
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
                        className="mr-2 font-black text-black hover:underline disabled:opacity-50"
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
                        className="text-[#ea5342] hover:underline disabled:opacity-50"
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
            className="w-full max-w-lg"
            role="dialog"
            aria-modal="true"
            aria-labelledby="edit-product-title"
          >
            <form
              onSubmit={onUpdate}
              className="overflow-hidden rounded-[1.4rem] border-2 border-black bg-[#eab660] shadow-[6px_6px_0_#000]"
            >
              <div className="flex items-center justify-between border-b-2 border-black bg-[#ea5342] px-4 py-3">
                <span
                  id="edit-product-title"
                  className="text-base font-black uppercase tracking-wide text-black"
                >
                  Editar Produto
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
              <div className="space-y-4 p-6">
                <label className="block text-base font-black text-black">
                  Nome
                  <input
                    name="name"
                    required
                    defaultValue={editing.name}
                    className="mt-1 w-full rounded-lg border-2 border-black bg-[#fff4e8] px-3 py-2 text-[#233d4d]"
                  />
                </label>
                <label className="block text-base font-black text-black">
                  Descrição
                  <textarea
                    name="description"
                    rows={2}
                    defaultValue={editing.description ?? ""}
                    className="mt-1 w-full rounded-lg border-2 border-black bg-[#fff4e8] px-3 py-2 text-[#233d4d]"
                  />
                </label>
                <label className="block text-base font-black text-black">
                  Preço
                  <BrlPriceInput
                    key={editing.id}
                    required
                    defaultValue={Number(editing.price)}
                    className="mt-1 w-full rounded-lg border-2 border-black bg-[#fff4e8] px-3 py-2 text-[#233d4d]"
                  />
                </label>
                <label className="block text-base font-black text-black">
                  Estoque
                  <input
                    name="stock_quantity"
                    type="number"
                    min="0"
                    required
                    defaultValue={editing.stock_quantity}
                    className="mt-1 w-full rounded-lg border-2 border-black bg-[#fff4e8] px-3 py-2 text-[#233d4d]"
                  />
                </label>
                <label className="block text-base font-black text-black">
                  Nova imagem (opcional)
                  <input
                    name="file"
                    type="file"
                    accept="image/png,image/jpeg,image/webp"
                    onChange={handleFileChange}
                    className="sr-only"
                  />
                  <p className="mt-1 w-full cursor-pointer rounded-lg border-2 border-black bg-[#fff4e8] p-2.5 text-sm text-[#233d4d]">
                    {fileStatus}
                  </p>
                </label>
                <div className="flex gap-2 pt-2">
                  <button
                    type="button"
                    disabled={busy}
                    className="flex-1 rounded-lg border-2 border-black py-2 font-black text-black disabled:opacity-50"
                    onClick={() => setEditing(null)}
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={busy}
                    className="flex-1 rounded-lg border-2 border-black bg-[#abcf85] py-2 font-black text-black hover:bg-emerald-500 disabled:opacity-50"
                  >
                    {busy ? "Salvando…" : "Salvar"}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </div>
  );
}
