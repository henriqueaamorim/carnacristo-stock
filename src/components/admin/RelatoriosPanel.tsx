"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  fmtRevenueBrl,
  PAYMENT_METHOD_LABELS,
  PAYMENT_METHODS,
  revenueByMethod,
} from "@/lib/reports/payment-labels";
import type { UserRole } from "@/types";

type ProfileOption = {
  id: string;
  email: string | null;
  full_name: string | null;
  role: UserRole;
};

const ROLE_LABEL: Record<UserRole, string> = {
  admin: "Admin",
  vendedor: "Vendedor",
};

function sellerOptionLabel(u: ProfileOption): string {
  const name = u.full_name?.trim() || u.email || u.id;
  return `${name} (${ROLE_LABEL[u.role]})`;
}

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
  productsCatalog: { product_id: string; product_name: string }[];
  paymentBySeller: {
    seller_id: string;
    email: string | null;
    full_name: string | null;
    methods: {
      payment_method: string;
      revenue: number;
      units: number;
      orders: number;
    }[];
  }[];
  productUnitsBySeller: {
    seller_id: string;
    email: string | null;
    full_name: string | null;
    products: {
      product_id: string;
      product_name: string;
      quantity: number;
    }[];
  }[];
  checksum: { orderItemsQuantitySum: number };
};

function sellerName(s: {
  seller_id: string;
  full_name: string | null;
  email: string | null;
}): string {
  return s.full_name?.trim() || s.email || s.seller_id;
}

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
  const [users, setUsers] = useState<ProfileOption[]>([]);
  const [usersLoading, setUsersLoading] = useState(true);
  const [data, setData] = useState<ReportJson | null>(null);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setUsersLoading(true);
      const res = await fetch("/api/admin/usuarios");
      const body = (await res.json().catch(() => ({}))) as ProfileOption[] | { error?: string };
      if (!cancelled) {
        if (res.ok) {
          const list = (body as ProfileOption[]).slice().sort((a, b) =>
            sellerOptionLabel(a).localeCompare(sellerOptionLabel(b), "pt-BR"),
          );
          setUsers(list);
        } else {
          setUsers([]);
        }
        setUsersLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

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
  const exportPdfHref = `/api/relatorios/export/pdf?${qs}`;

  return (
    <div className="space-y-6">
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
          Vendedores
          <select
            value={sellerId}
            onChange={(e) => setSellerId(e.target.value)}
            disabled={usersLoading}
            className="mt-1 block min-w-[16rem] max-w-full rounded-lg border-2 border-black bg-[#fff4e8] px-2 py-1 text-sm text-[#233d4d] disabled:opacity-50"
          >
            <option value="">Todos os vendedores</option>
            {users.map((u) => (
              <option key={u.id} value={u.id}>
                {sellerOptionLabel(u)}
              </option>
            ))}
          </select>
        </label>
        <button
          type="button"
          onClick={() => void load()}
          className="rounded-lg border-2 border-black bg-[#abcf85] px-4 py-2 text-sm font-black text-black"
        >
          Atualizar
        </button>
        <a
          href={exportHref}
          className="rounded-lg border-2 border-black bg-[#fff4e8] px-4 py-2 text-sm font-black text-black"
        >
          Exportar CSV
        </a>
        <a
          href={exportPdfHref}
          className="rounded-lg border-2 border-black bg-[#fff4e8] px-4 py-2 text-sm font-black text-black"
        >
          Exportar PDF
        </a>
      </div>

      {err ? (
        <p
          className="rounded-lg border-2 border-red-600 bg-red-50 p-4 text-sm font-semibold text-red-900 shadow-sm"
          role="alert"
        >
          {err}
        </p>
      ) : null}
      {loading ? <p className="text-[#233d4d]">Carregando…</p> : null}

      {data && !loading ? (
        <div className="space-y-8">
          <div className="grid gap-4 sm:grid-cols-3">
            <div className="rounded-[1.4rem] border-2 border-black bg-[#eab660] p-4 shadow-[6px_6px_0_#000]">
              <p className="text-xs font-black text-black">Receita (pedidos finalizados)</p>
              <p className="text-2xl font-black text-[#233d4d]">
                {data.totals.revenue.toLocaleString("pt-BR", {
                  style: "currency",
                  currency: "BRL",
                })}
              </p>
            </div>
            <div className="rounded-[1.4rem] border-2 border-black bg-[#eab660] p-4 shadow-[6px_6px_0_#000]">
              <p className="text-xs font-black text-black">Unidades vendidas</p>
              <p className="text-2xl font-black text-[#233d4d]">{data.totals.unitsSold}</p>
            </div>
            <div className="rounded-[1.4rem] border-2 border-black bg-[#eab660] p-4 shadow-[6px_6px_0_#000]">
              <p className="text-xs font-black text-black">Pedidos</p>
              <p className="text-2xl font-black text-[#233d4d]">{data.totals.ordersCount}</p>
            </div>
          </div>

          <div>
            <h2 className="mb-2 text-base font-black text-black">Por vendedor</h2>
            <div className="overflow-x-auto rounded-[1.4rem] border-2 border-black bg-[#eab660] shadow-[6px_6px_0_#000]">
              <table className="min-w-full text-left text-sm text-[#233d4d]">
                <thead className="border-b-2 border-black bg-[#ea5342] text-black">
                  <tr>
                    <th className="p-3 font-black">Nome</th>
                    <th className="p-3 font-black">Receita</th>
                    <th className="p-3 font-black">Unidades</th>
                    <th className="p-3 font-black">Pedidos</th>
                  </tr>
                </thead>
                <tbody>
                  {data.performance.map((p) => (
                    <tr key={p.seller_id} className="border-b border-black/20">
                      <td className="p-3 font-bold text-black">{p.full_name || "—"}</td>
                      <td className="p-3 font-bold text-black">
                        {p.revenue.toLocaleString("pt-BR", {
                          style: "currency",
                          currency: "BRL",
                        })}
                      </td>
                      <td className="p-3 font-mono">{p.units}</td>
                      <td className="p-3 font-mono">{p.orders}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div>
            <h2 className="mb-2 text-base font-black text-black">Por forma de pagamento</h2>
            <div className="overflow-x-auto rounded-[1.4rem] border-2 border-black bg-[#eab660] shadow-[6px_6px_0_#000]">
              <table className="min-w-full text-left text-sm text-[#233d4d]">
                <thead className="border-b-2 border-black bg-[#ea5342] text-black">
                  <tr>
                    <th className="p-3 font-black">Método</th>
                    <th className="p-3 font-black">Receita</th>
                    <th className="p-3 font-black">Unidades</th>
                    <th className="p-3 font-black">Pedidos</th>
                  </tr>
                </thead>
                <tbody>
                  {data.paymentBreakdown.map((p) => (
                    <tr key={p.payment_method} className="border-b border-black/20">
                      <td className="p-3 font-bold text-black">{p.payment_method}</td>
                      <td className="p-3 font-bold text-black">
                        {p.revenue.toLocaleString("pt-BR", {
                          style: "currency",
                          currency: "BRL",
                        })}
                      </td>
                      <td className="p-3 font-mono">{p.units}</td>
                      <td className="p-3 font-mono">{p.orders}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div>
            <h2 className="mb-2 text-base font-black text-black">Pagamento por vendedor</h2>
            <div className="overflow-x-auto rounded-[1.4rem] border-2 border-black bg-[#eab660] shadow-[6px_6px_0_#000]">
              <table className="min-w-full text-left text-sm text-[#233d4d]">
                <thead className="border-b-2 border-black bg-[#ea5342] text-black">
                  <tr>
                    <th className="p-3 font-black">Vendedor</th>
                    {PAYMENT_METHODS.map((method) => (
                      <th key={method} className="p-3 font-black whitespace-nowrap">
                        {PAYMENT_METHOD_LABELS[method]}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {data.paymentBySeller.length === 0 ? (
                    <tr>
                      <td colSpan={1 + PAYMENT_METHODS.length} className="p-3 text-black">
                        Sem vendedores no período.
                      </td>
                    </tr>
                  ) : (
                    data.paymentBySeller.map((seller) => {
                      const revenues = revenueByMethod(seller);
                      return (
                        <tr key={seller.seller_id} className="border-b border-black/20">
                          <td className="p-3 font-bold text-black whitespace-nowrap">
                            {sellerName(seller)}
                          </td>
                          {PAYMENT_METHODS.map((method) => (
                            <td key={method} className="p-3 font-bold text-black whitespace-nowrap">
                              {fmtRevenueBrl(revenues[method])}
                            </td>
                          ))}
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>

          <div>
            <h2 className="mb-2 text-base font-black text-black">Produtos por vendedor</h2>
            {data.productUnitsBySeller.length === 0 ? (
              <p className="rounded-lg border-2 border-black bg-[#fff4e8] p-3 text-sm text-[#233d4d]">
                Sem vendedores no período.
              </p>
            ) : (
              <div className="space-y-6">
                {data.productUnitsBySeller.map((seller) => (
                  <div key={seller.seller_id}>
                    <h3 className="mb-2 text-sm font-black text-black">{sellerName(seller)}</h3>
                    <div className="overflow-x-auto rounded-[1.4rem] border-2 border-black bg-[#eab660] shadow-[6px_6px_0_#000]">
                      <table className="min-w-full text-left text-sm text-[#233d4d]">
                        <thead className="border-b-2 border-black bg-[#ea5342] text-black">
                          <tr>
                            <th className="p-3 font-black">Produto</th>
                            <th className="p-3 font-black">Quantidade</th>
                          </tr>
                        </thead>
                        <tbody>
                          {seller.products.map((product) => (
                            <tr
                              key={product.product_id}
                              className="border-b border-black/20"
                            >
                              <td className="p-3 font-bold text-black">{product.product_name}</td>
                              <td className="p-3 font-mono">{product.quantity}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <p className="rounded-lg border-2 border-black bg-[#fff4e8] p-3 text-xs text-[#233d4d]">
            Conferência: soma das quantidades em{" "}
            <code className="rounded border border-black bg-[#eab660] px-1 text-[#233d4d]">
              order_items
            </code>{" "}
            dos pedidos
            filtrados = {data.checksum.orderItemsQuantitySum} (igual a &quot;Unidades
            vendidas&quot; acima).
          </p>
        </div>
      ) : null}
    </div>
  );
}
