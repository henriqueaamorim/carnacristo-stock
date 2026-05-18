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
      <section className="rounded-xl border border-slate-700 bg-orange-200/40 p-6">
        <h2 className="mb-4 text-lg font-medium text-[#233d4d]">Novo usuário</h2>
        <form onSubmit={onCreate} className="grid max-w-lg gap-3 sm:grid-cols-2">
          <label className="text-sm text-[#233d4d] sm:col-span-2">
            E-mail
            <input
              name="email"
              type="email"
              required
              autoComplete="off"
              className="mt-1 w-full rounded-lg border border-slate-600 bg-orange-200 px-3 py-2 text-[#233d4d]"
            />
          </label>
          <label className="text-sm text-[#233d4d]">
            Senha inicial
            <input
              name="password"
              type="password"
              minLength={6}
              required
              autoComplete="new-password"
              className="mt-1 w-full rounded-lg border border-slate-600 bg-orange-200 px-3 py-2 text-[#233d4d]"
            />
          </label>
          <label className="text-sm text-[#233d4d]">
            Perfil
            <select
              name="role"
              required
              defaultValue="vendedor"
              className="mt-1 w-full rounded-lg border border-slate-600 bg-orange-200 px-3 py-2 text-[#233d4d]"
            >
              <option value="vendedor">Vendedor</option>
              <option value="admin">Admin</option>
            </select>
          </label>
          <label className="text-sm text-[#233d4d] sm:col-span-2">
            Nome
            <input
              name="full_name"
              required
              className="mt-1 w-full rounded-lg border border-slate-600 bg-orange-200 px-3 py-2 text-[#233d4d]"
            />
          </label>
          <div className="sm:col-span-2">
            <button
              type="submit"
              disabled={busy}
              className="rounded-lg bg-emerald-600 px-4 py-2 font-medium text-white hover:bg-emerald-500 disabled:opacity-50"
            >
              {busy ? "Salvando…" : "Cadastrar usuário"}
            </button>
          </div>
        </form>
      </section>

      {editing ? (
        <section className="rounded-xl border border-emerald-700/50 bg-slate-900/40 p-6">
          <h2 className="mb-4 text-lg font-medium text-[#233d4d]">Editar usuário</h2>
          <p className="mb-3 text-sm text-slate-400">{editing.email}</p>
          <form onSubmit={onUpdate} className="grid max-w-lg gap-3">
            <label className="text-sm text-[#233d4d]">
              Nome
              <input
                name="full_name"
                required
                defaultValue={editing.full_name ?? ""}
                className="mt-1 w-full rounded-lg border border-slate-600 bg-orange-200 px-3 py-2 text-[#233d4d]"
              />
            </label>
            <label className="text-sm text-[#233d4d]">
              Nova senha inicial (opcional)
              <input
                name="password"
                type="password"
                minLength={6}
                autoComplete="new-password"
                placeholder="Deixe em branco para manter"
                className="mt-1 w-full rounded-lg border border-slate-600 bg-orange-200 px-3 py-2 text-[#233d4d]"
              />
            </label>
            <div className="flex flex-wrap gap-2">
              <button
                type="submit"
                disabled={busy}
                className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
              >
                {busy ? "Salvando…" : "Salvar"}
              </button>
              <button
                type="button"
                disabled={busy}
                onClick={() => setEditing(null)}
                className="rounded-lg border border-slate-600 px-4 py-2 text-sm text-slate-300 hover:bg-slate-800"
              >
                Cancelar
              </button>
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
        <h2 className="mb-3 text-lg font-medium text-[#233d4d]">Usuários cadastrados</h2>
        {loading ? (
          <p className="text-slate-400">Carregando…</p>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-slate-700">
            <table className="w-full min-w-[640px] text-left text-sm">
              <thead className="border-b border-slate-700 bg-orange-200 text-[#233d4d]">
                <tr>
                  <th className="p-3 font-medium">Nome</th>
                  <th className="p-3 font-medium">Perfil</th>
                  <th className="p-3 font-medium">Data de criação</th>
                  <th className="p-3 font-medium">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {list.map((u) => (
                  <tr key={u.id} className="text-[#233d4d]">
                    <td className="p-3">
                      <span className="font-medium">{u.full_name || "—"}</span>
                      {u.email ? (
                        <span className="mt-0.5 block text-xs text-slate-500">{u.email}</span>
                      ) : null}
                    </td>
                    <td className="p-3">{ROLE_LABEL[u.role] ?? u.role}</td>
                    <td className="p-3 whitespace-nowrap">{formatDate(u.created_at)}</td>
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
                          className="rounded border border-slate-600 px-2 py-1 text-xs hover:bg-slate-800 disabled:opacity-50"
                        >
                          Editar
                        </button>
                        <button
                          type="button"
                          disabled={busy}
                          onClick={() => void onDelete(u)}
                          className="rounded border border-red-800/80 px-2 py-1 text-xs text-red-400 hover:bg-red-950/40 disabled:opacity-50"
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
