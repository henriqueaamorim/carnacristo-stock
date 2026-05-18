"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

type ReportJson = {
  from: string;
  to: string;
  totals: { revenue: number; unitsSold: number; ordersCount: number };
  performance: {
    seller_id: string;
    email: string | null;
    full_name: string | null;
    revenue: number;
    units: number;
    orders: number;
  }[];
  paymentBreakdown: {
    payment_method: string;
    revenue: number;
    units: number;
    orders: number;
  }[];
  checksum: { orderItemsQuantitySum: number };
};

function defaultRange() {
  const to = new Date();
  const from = new Date();
  from.setDate(from.getDate() - 30);
  return { from: from.toISOString(), to: to.toISOString() };
}

export function RelatoriosPanel() {
  const init = useMemo(() => defaultRange(), []);
  const [from, setFrom] = useState(init.from.slice(0, 16));
  const [to, setTo] = useState(init.to.slice(0, 16));
  const [sellerId, setSellerId] = useState("");
  const [data, setData] = useState<ReportJson | null>(null);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const qs = useMemo(() => {
    const u = new URLSearchParams();
    u.set("from", new Date(from).toISOString());
    u.set("to", new Date(to).toISOString());
    if (sellerId.trim()) u.set("sellerId", sellerId.trim());
    return u.toString();
  }, [from, to, sellerId]);

  const load = useCallback(async () => {
    setLoading(true);
    setErr(null);
    const res = await fetch(`/api/relatorios?${qs}`);
    const body = (await res.json().catch(() => ({}))) as ReportJson | { error?: string };
    if (!res.ok) {
      setData(null);
      setErr((body as { error?: string }).error || "Erro");
    } else {
      setData(body as ReportJson);
    }
    setLoading(false);
  }, [qs]);

  useEffect(() => {
    void load();
  }, [load]);

  const exportHref = `/api/relatorios/export?${qs}`;

  return (
    <div className="space-y-6">
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
          Vendedor (UUID opcional)
          <input
            value={sellerId}
            onChange={(e) => setSellerId(e.target.value)}
            placeholder="seller_id"
            className="mt-1 block w-64 rounded-lg border border-slate-600 bg-orange-200 px-2 py-1 font-mono text-xs text-[#233d4d]"
          />
        </label>
        <button
          type="button"
          onClick={() => void load()}
          className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white"
        >
          Atualizar
        </button>
        <a
          href={exportHref}
          className="rounded-lg border border-slate-500 px-4 py-2 text-sm text-[#233d4d] hover:bg-orange-200"
        >
          Exportar CSV (snapshot)
        </a>
      </div>

      {err ? (
        <p className="text-sm text-red-400" role="alert">
          {err}
        </p>
      ) : null}
      {loading ? <p className="text-[#233d4d]">Carregando…</p> : null}

      {data && !loading ? (
        <div className="space-y-8">
          <div className="grid gap-4 sm:grid-cols-3">
            <div className="rounded-xl border border-slate-700 bg-orange-200/50 p-4">
              <p className="text-xs text-[#233d4d]">Receita (pedidos completed)</p>
              <p className="text-2xl font-semibold text-[#233d4d]">
                {data.totals.revenue.toLocaleString("pt-BR", {
                  style: "currency",
                  currency: "BRL",
                })}
              </p>
            </div>
            <div className="rounded-xl border border-slate-700 bg-orange-200/50 p-4">
              <p className="text-xs text-[#233d4d]">Unidades vendidas</p>
              <p className="text-2xl font-semibold text-[#233d4d]">{data.totals.unitsSold}</p>
            </div>
            <div className="rounded-xl border border-slate-700 bg-orange-200/50 p-4">
              <p className="text-xs text-[#233d4d]">Pedidos</p>
              <p className="text-2xl font-semibold text-[#233d4d]">{data.totals.ordersCount}</p>
            </div>
          </div>

          <div>
            <h2 className="mb-2 text-lg font-medium text-[#233d4d]">Por vendedor</h2>
            <div className="overflow-x-auto rounded-xl border border-slate-700 bg-orange-200/50">
              <table className="min-w-full text-left text-sm text-[#233d4d]">
                <thead className="border-b border-slate-700 bg-orange-200/50">
                  <tr>
                    <th className="p-2">E-mail</th>
                    <th className="p-2">Nome</th>
                    <th className="p-2">Receita</th>
                    <th className="p-2">Unidades</th>
                    <th className="p-2">Pedidos</th>
                  </tr>
                </thead>
                <tbody>
                  {data.performance.map((p) => (
                    <tr key={p.seller_id} className="border-b border-slate-800">
                      <td className="p-2 text-xs">{p.email}</td>
                      <td className="p-2">{p.full_name || "—"}</td>
                      <td className="p-2">
                        {p.revenue.toLocaleString("pt-BR", {
                          style: "currency",
                          currency: "BRL",
                        })}
                      </td>
                      <td className="p-2 font-mono">{p.units}</td>
                      <td className="p-2 font-mono">{p.orders}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div>
            <h2 className="mb-2 text-lg font-medium text-[#233d4d]">Por forma de pagamento</h2>
            <div className="overflow-x-auto rounded-xl border border-slate-700 bg-orange-200/50">
              <table className="min-w-full text-left text-sm text-[#233d4d]">
                <thead className="border-b border-slate-700 bg-orange-200/50">
                  <tr>
                    <th className="p-2">Método</th>
                    <th className="p-2">Receita</th>
                    <th className="p-2">Unidades</th>
                    <th className="p-2">Pedidos</th>
                  </tr>
                </thead>
                <tbody>
                  {data.paymentBreakdown.map((p) => (
                    <tr key={p.payment_method} className="border-b border-slate-800">
                      <td className="p-2">{p.payment_method}</td>
                      <td className="p-2">
                        {p.revenue.toLocaleString("pt-BR", {
                          style: "currency",
                          currency: "BRL",
                        })}
                      </td>
                      <td className="p-2 font-mono">{p.units}</td>
                      <td className="p-2 font-mono">{p.orders}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <p className="text-xs text-[#233d4d]">
            Conferência: soma das quantidades em{" "}
            <code className="rounded bg-orange-200 px-1 text-[#233d4d]">order_items</code> dos pedidos
            filtrados = {data.checksum.orderItemsQuantitySum} (igual a &quot;Unidades
            vendidas&quot; acima).
          </p>
        </div>
      ) : null}
    </div>
  );
}
