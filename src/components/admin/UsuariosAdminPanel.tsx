"use client";

import { useCallback, useEffect, useState } from "react";
import type { UserRole } from "@/types";

type ProfileRow = {
  id: string;
  email: string | null;
  full_name: string | null;
  role: UserRole;
  created_at: string;
};

const ROLE_LABEL: Record<UserRole, string> = {
  admin: "Admin",
  vendedor: "Vendedor",
};

/** Textos do cadastro (novo usuário) — edite aqui */
const CREATE_SUCCESS_MSG =
  "✅ Usuário cadastrado com sucesso! Ele já pode fazer login.";
const CREATE_ERROR_FALLBACK = "❌ Não foi possível cadastrar o usuário. Tente novamente.";

function formatDate(iso: string) {
  return new Date(iso).toLocaleString("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
  });
}

export function UsuariosAdminPanel() {
  const [list, setList] = useState<ProfileRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [editing, setEditing] = useState<ProfileRow | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setErr(null);
    const res = await fetch("/api/admin/usuarios");
    const body = (await res.json().catch(() => ({}))) as ProfileRow[] | { error?: string };
    if (!res.ok) {
      setErr((body as { error?: string }).error || "Erro ao listar usuários");
      setList([]);
    } else {
      setList(body as ProfileRow[]);
    }
    setLoading(false);
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
    const email = String(fd.get("email") ?? "").trim();
    const password = String(fd.get("password") ?? "");
    const full_name = String(fd.get("full_name") ?? "").trim();
    const role = String(fd.get("role") ?? "") as UserRole;
    try {
      const res = await fetch("/api/admin/usuarios", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password, full_name, role }),
      });
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
    const full_name = String(fd.get("full_name") ?? "").trim();
    const password = String(fd.get("password") ?? "");
    const payload: { full_name: string; password?: string } = { full_name };
    if (password) payload.password = password;
    try {
      const res = await fetch(`/api/admin/usuarios/${editing.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const body = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) {
        setErr(body.error || "Erro ao atualizar usuário");
        return;
      }
      setMsg("Usuário atualizado.");
      setEditing(null);
      await load();
    } finally {
      setBusy(false);
    }
  }

  async function onDelete(row: ProfileRow) {
    const label = row.full_name || row.email || row.id;
    if (!confirm(`Excluir o usuário "${label}"? Esta ação não pode ser desfeita.`)) return;
    setMsg(null);
    setErr(null);
    setBusy(true);
    try {
      const res = await fetch(`/api/admin/usuarios/${row.id}`, { method: "DELETE" });
      const body = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) {
        setErr(body.error || "Erro ao excluir usuário");
        return;
      }
      setMsg("Usuário excluído.");
      if (editing?.id === row.id) setEditing(null);
      await load();
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-8">
      <section>
        <form
          onSubmit={onCreate}
          className="overflow-hidden rounded-[1.4rem] border-2 border-black bg-[#eab660] shadow-[6px_6px_0_#000]"
        >
          <div className="flex items-center justify-between border-b-2 border-black bg-[#ea5342] px-4 py-3">
            <span className="text-base font-black uppercase tracking-wide text-black">
              Novo usuário
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
          <div className="grid gap-3 p-6 sm:grid-cols-2">
            <label className="text-base font-black text-black sm:col-span-2">
              E-mail
              <input
                name="email"
                type="email"
                required
                autoComplete="off"
                className="mt-1 w-full rounded-lg border-2 border-black bg-[#fff4e8] px-3 py-2 text-[#233d4d]"
              />
            </label>
            <label className="text-base font-black text-black">
              Senha inicial
              <input
                name="password"
                type="password"
                minLength={6}
                required
                autoComplete="new-password"
                className="mt-1 w-full rounded-lg border-2 border-black bg-[#fff4e8] px-3 py-2 text-[#233d4d]"
              />
            </label>
            <label className="text-base font-black text-black">
              Perfil
              <select
                name="role"
                required
                defaultValue="vendedor"
                className="mt-1 w-full rounded-lg border-2 border-black bg-[#fff4e8] px-3 py-2 text-[#233d4d]"
              >
                <option value="vendedor">Vendedor</option>
                <option value="admin">Admin</option>
              </select>
            </label>
            <label className="text-base font-black text-black sm:col-span-2">
              Nome
              <input
                name="full_name"
                required
                className="mt-1 w-full rounded-lg border-2 border-black bg-[#fff4e8] px-3 py-2 text-[#233d4d]"
              />
            </label>
            <div className="sm:col-span-2">
              <button
                type="submit"
                disabled={busy}
                className="rounded-lg border-2 border-black bg-[#abcf85] px-4 py-2 font-black text-black hover:bg-emerald-500 disabled:opacity-50"
              >
                {busy ? "Salvando…" : "Cadastrar usuário"}
              </button>
            </div>
          </div>
        </form>
      </section>

      {editing ? (
        <section>
          <form
            onSubmit={onUpdate}
            className="overflow-hidden rounded-[1.4rem] border-2 border-black bg-[#eab660] shadow-[6px_6px_0_#000]"
          >
            <div className="flex items-center justify-between border-b-2 border-black bg-[#ea5342] px-4 py-3">
              <span className="text-base font-black uppercase tracking-wide text-black">
                Editar usuário
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
            <div className="grid gap-3 p-6">
              <p className="text-sm font-medium text-[#233d4d]">
                {editing.email ?? "Sem e-mail"}
              </p>
              <label className="text-base font-black text-black">
                Nome
                <input
                  name="full_name"
                  required
                  defaultValue={editing.full_name ?? ""}
                  className="mt-1 w-full rounded-lg border-2 border-black bg-[#fff4e8] px-3 py-2 text-[#233d4d]"
                />
              </label>
              <label className="text-base font-black text-black">
                Nova senha inicial (opcional)
                <input
                  name="password"
                  type="password"
                  minLength={6}
                  autoComplete="new-password"
                  placeholder="Deixe em branco para manter"
                  className="mt-1 w-full rounded-lg border-2 border-black bg-[#fff4e8] px-3 py-2 text-[#233d4d]"
                />
              </label>
              <div className="flex flex-wrap gap-2 pt-2">
                <button
                  type="submit"
                  disabled={busy}
                  className="rounded-lg border-2 border-black bg-[#abcf85] px-4 py-2 text-sm font-black text-black disabled:opacity-50"
                >
                  {busy ? "Salvando…" : "Salvar"}
                </button>
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => setEditing(null)}
                  className="rounded-lg border-2 border-black px-4 py-2 text-sm font-black text-black disabled:opacity-50"
                >
                  Cancelar
                </button>
              </div>
            </div>
          </form>
        </section>
      ) : null}

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
        <h2 className="mb-3 text-base font-black text-black">Usuários cadastrados</h2>
        {loading ? (
          <p className="text-slate-400">Carregando…</p>
        ) : (
          <div className="overflow-x-auto rounded-[1.4rem] border-2 border-black bg-[#eab660] shadow-[6px_6px_0_#000]">
            <table className="w-full min-w-[640px] text-left text-sm text-black">
              <thead className="border-b-2 border-black bg-[#ea5342]">
                <tr>
                  <th className="p-3 font-black">Nome</th>
                  <th className="p-3 font-black">Perfil</th>
                  <th className="p-3 font-black">Data de criação</th>
                  <th className="p-3 font-black">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-black/30">
                {list.map((u) => (
                  <tr key={u.id} className="text-[#233d4d]">
                    <td className="p-3">
                      <span className="font-bold text-black">{u.full_name || "—"}</span>
                      {u.email ? (
                        <span className="mt-0.5 block text-xs text-white">{u.email}</span>
                      ) : null}
                    </td>
                    <td className="p-3 text-black">{ROLE_LABEL[u.role] ?? u.role}</td>
                    <td className="p-3 whitespace-nowrap text-black">{formatDate(u.created_at)}</td>
                    <td className="p-3">
                      <div className="flex flex-wrap gap-2">
                        <button
                          type="button"
                          disabled={busy}
                          onClick={() => {
                            setEditing(u);
                            setMsg(null);
                            setErr(null);
                          }}
                          className="rounded border-2 border-black px-2 py-1 text-xs font-black text-black disabled:opacity-50"
                        >
                          Editar
                        </button>
                        <button
                          type="button"
                          disabled={busy}
                          onClick={() => void onDelete(u)}
                          className="rounded border-2 border-black px-2 py-1 text-xs font-black text-[#ea5342] disabled:opacity-50"
                        >
                          Excluir
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                {list.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="p-6 text-center text-slate-500">
                      Nenhum usuário cadastrado.
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
