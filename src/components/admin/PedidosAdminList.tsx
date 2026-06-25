"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  formatOrderStatus,
  ORDER_STATUS_LABEL,
  type OrderStatus,
} from "@/utils/orderStatus";
import { formatPaymentMethod } from "@/utils/paymentMethod";
import {
  isOrderTitleSearchActive,
  normalizeOrderTitleSearch,
  ORDER_TITLE_SEARCH_MIN_LENGTH,
} from "@/utils/orderTitleSearch";

type OrderRow = {
  id: string;
  order_id_display: string;
  title: string;
  seller_id: string;
  payment_method: string | null;
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
  const [titleInput, setTitleInput] = useState("");
  const [titleQuery, setTitleQuery] = useState("");
  const [rows, setRows] = useState<OrderRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setTitleQuery(titleInput);
    }, 300);
    return () => window.clearTimeout(timer);
  }, [titleInput]);

  const titleFilterActive = isOrderTitleSearchActive(titleQuery);
  const titleHintVisible =
    normalizeOrderTitleSearch(titleInput).length > 0 && !titleFilterActive;

  const qs = useMemo(() => {
    const u = new URLSearchParams();
    u.set("from", new Date(from).toISOString());
    u.set("to", new Date(to).toISOString());
    u.set("status", status);
    if (isOrderTitleSearchActive(titleQuery)) {
      u.set("title", normalizeOrderTitleSearch(titleQuery));
    }
    return u.toString();
  }, [from, to, status, titleQuery]);

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

  const emptyMessage = titleFilterActive
    ? "Nenhum pedido encontrado para este título no período."
    : "Nenhum pedido no período.";

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end gap-3 rounded-[1.4rem] border-2 border-black bg-[#eab660] p-4 shadow-[6px_6px_0_#000]">
        <label className="text-sm font-black text-black">
          De
          <input
            type="datetime-local"
            value={from}
            onChange={(e) => setFrom(e.target.value)}
            className="mt-1 block rounded-lg border-2 border-black bg-[#fff4e8] px-2 py-1 text-[#233d4d]"
          />
        </label>
        <label className="text-sm font-black text-black">
          Até
          <input
            type="datetime-local"
            value={to}
            onChange={(e) => setTo(e.target.value)}
            className="mt-1 block rounded-lg border-2 border-black bg-[#fff4e8] px-2 py-1 text-[#233d4d]"
          />
        </label>
        <label className="text-sm font-black text-black">
          Status
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            className="mt-1 block rounded-lg border-2 border-black bg-[#fff4e8] px-2 py-1 text-[#233d4d]"
          >
            <option value="all">Todos</option>
            {(Object.keys(ORDER_STATUS_LABEL) as OrderStatus[]).map((s) => (
              <option key={s} value={s}>
                {ORDER_STATUS_LABEL[s]}
              </option>
            ))}
          </select>
        </label>
        <label className="min-w-[12rem] flex-1 text-sm font-black text-black">
          Título
          <input
            type="search"
            value={titleInput}
            onChange={(e) => setTitleInput(e.target.value)}
            placeholder={`Buscar título (mín. ${ORDER_TITLE_SEARCH_MIN_LENGTH} letras)`}
            aria-describedby={titleHintVisible ? "pedidos-title-hint" : undefined}
            className="mt-1 block w-full min-w-[12rem] rounded-lg border-2 border-black bg-[#fff4e8] px-2 py-1 text-[#233d4d]"
          />
        </label>
        <button
          type="button"
          onClick={() => void load()}
          className="rounded-lg border-2 border-black bg-[#abcf85] px-4 py-2 text-sm font-black text-black"
        >
          Atualizar
        </button>
      </div>

      {titleHintVisible ? (
        <p
          id="pedidos-title-hint"
          className="text-sm font-semibold text-[#233d4d]"
        >
          Digite pelo menos {ORDER_TITLE_SEARCH_MIN_LENGTH} caracteres para buscar.
        </p>
      ) : null}

      {err ? (
        <p
          className="rounded-lg border-2 border-red-600 bg-red-50 p-4 text-sm font-semibold text-red-900 shadow-sm"
          role="alert"
        >
          {err}
        </p>
      ) : null}

      {loading ? (
        <p className="text-[#233d4d]">Carregando…</p>
      ) : (
        <div className="overflow-x-auto rounded-[1.4rem] border-2 border-black bg-[#eab660] shadow-[6px_6px_0_#000]">
          <table className="min-w-full text-left text-sm text-[#233d4d] p-4">
            <thead className="border-b-2 border-black bg-[#ea5342] text-black p-4">
              <tr>
                <th className="p-3 font-black">ID</th>
                <th className="p-4 font-black">Título</th>
                <th className="p-4 font-black">Vendedor</th>
                <th className="p-4 font-black">Pagamento</th>
                <th className="p-4 font-black">Total</th>
                <th className="p-4 font-black">Status</th>
                <th className="p-4 font-black">Data</th>
                <th className="p-4" />
              </tr>
            </thead>
            <tbody>
              {rows.map((o) => (
                <tr key={o.id} className="border-b border-black/20">
                  <td className="p-4 font-bold text-black">{o.order_id_display}</td>
                  <td className="p-4 font-bold text-black">{o.title}</td>
                  <td className="p-4 font-bold text-black">
                    {o.seller?.full_name?.trim() || o.seller?.email || "—"}
                  </td>
                  <td className="p-4 font-bold text-black">
                    {formatPaymentMethod(o.payment_method)}
                  </td>
                  <td className="p-4 font-bold text-black">
                    {Number(o.total_amount).toLocaleString("pt-BR", {
                      style: "currency",
                      currency: "BRL",
                    })}
                  </td>
                  <td className="p-4 font-bold text-black">
                    {o.status === "pending" ? (
                      <span className="rounded border-2 border-amber-700 bg-amber-100 px-2 py-0.5 text-xs font-black text-amber-950">
                        {formatOrderStatus(o.status)}
                      </span>
                    ) : (
                      formatOrderStatus(o.status)
                    )}
                  </td>
                  <td className="p-4 font-bold text-black">
                    {new Date(o.created_at).toLocaleString("pt-BR")}
                  </td>
                  <td className="p-4 text-right">
                    <Link
                      href={`/pedidos/${o.id}`}
                      className="rounded border-2 border-black bg-[#abcf85] px-2 py-1 text-xs font-black text-black"
                    >
                      Detalhe
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {rows.length === 0 ? (
            <p className="p-6 text-center text-slate-500">{emptyMessage}</p>
          ) : null}
        </div>
      )}
    </div>
  );
}
