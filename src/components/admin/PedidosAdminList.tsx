"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";

type OrderRow = {
  id: string;
  order_id_display: string;
  title: string;
  seller_id: string;
  payment_method: string;
  total_amount: number;
  status: string;
  created_at: string;
  seller: { email: string | null; full_name: string | null } | null;
};

function defaultRange() {
  const to = new Date();
  const from = new Date();
  from.setDate(from.getDate() - 30);
  return {
    from: from.toISOString(),
    to: to.toISOString(),
  };
}

export function PedidosAdminList() {
  const [from, setFrom] = useState(() => defaultRange().from.slice(0, 16));
  const [to, setTo] = useState(() => defaultRange().to.slice(0, 16));
  const [status, setStatus] = useState("all");
  const [rows, setRows] = useState<OrderRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const qs = useMemo(() => {
    const u = new URLSearchParams();
    u.set("from", new Date(from).toISOString());
    u.set("to", new Date(to).toISOString());
    u.set("status", status);
    return u.toString();
  }, [from, to, status]);

  const load = useCallback(async () => {
    setLoading(true);
    setErr(null);
    const res = await fetch(`/api/pedidos?${qs}`);
    const body = (await res.json().catch(() => ({}))) as OrderRow[] | { error?: string };
    if (!res.ok) {
      setErr((body as { error?: string }).error || "Erro");
      setRows([]);
    } else {
      setRows(body as OrderRow[]);
    }
    setLoading(false);
  }, [qs]);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end gap-3 rounded-xl border border-slate-700 bg-orange-200/50 p-4">
        <label className="text-sm text-[#233d4d]">
          De
          <input
            type="datetime-local"
            value={from}
            onChange={(e) => setFrom(e.target.value)}
            className="mt-1 block rounded-lg border border-slate-600 bg-orange-200 px-2 py-1 text-[#233d4d]"
          />
        </label>
        <label className="text-sm text-[#233d4d]">
          Até
          <input
            type="datetime-local"
            value={to}
            onChange={(e) => setTo(e.target.value)}
            className="mt-1 block rounded-lg border border-slate-600 bg-orange-200 px-2 py-1 text-[#233d4d]"
          />
        </label>
        <label className="text-sm text-[#233d4d]">
          Status
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            className="mt-1 block rounded-lg border border-slate-600 bg-orange-200 px-2 py-1 text-[#233d4d]"
          >
            <option value="all">Todos</option>
            <option value="completed">Finalizado</option>
            <option value="cancelled">Cancelado</option>
          </select>
        </label>
        <button
          type="button"
          onClick={() => void load()}
          className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white"
        >
          Atualizar
        </button>
      </div>

      {err ? (
        <p className="text-sm text-red-400" role="alert">
          {err}
        </p>
      ) : null}

      {loading ? (
        <p className="text-slate-400">Carregando…</p>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-slate-700">
          <table className="min-w-full text-left text-sm text-[#233d4d]">
            <thead className="border-b border-slate-700 bg-orange-200">
              <tr>
                <th className="p-2">#</th>
                <th className="p-2">Título</th>
                <th className="p-2">Vendedor</th>
                <th className="p-2">Pagamento</th>
                <th className="p-2">Total</th>
                <th className="p-2">Status</th>
                <th className="p-2">Data</th>
                <th className="p-2" />
              </tr>
            </thead>
            <tbody>
              {rows.map((o) => (
                <tr key={o.id} className="border-b border-slate-800">
                  <td className="p-2 font-mono text-xs">{o.order_id_display}</td>
                  <td className="p-2">{o.title}</td>
                  <td className="p-2 text-xs text-slate-400">
                    {o.seller?.email ?? o.seller_id}
                  </td>
                  <td className="p-2">{o.payment_method}</td>
                  <td className="p-2">
                    {Number(o.total_amount).toLocaleString("pt-BR", {
                      style: "currency",
                      currency: "BRL",
                    })}
                  </td>
                  <td className="p-2">{o.status}</td>
                  <td className="p-2 text-xs text-slate-500">
                    {new Date(o.created_at).toLocaleString("pt-BR")}
                  </td>
                  <td className="p-2 text-right">
                    <Link
                      href={`/pedidos/${o.id}`}
                      className="text-emerald-400 hover:underline"
                    >
                      Detalhe
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {rows.length === 0 ? (
            <p className="p-6 text-center text-slate-500">Nenhum pedido no período.</p>
          ) : null}
        </div>
      )}
    </div>
  );
}
