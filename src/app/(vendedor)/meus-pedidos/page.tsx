"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

type OrderRow = {
  id: string;
  order_id_display: string;
  title: string;
  total_amount: number;
  status: string;
  created_at: string;
  amountPaid: number;
  remainingBalance: number;
};

function fmtBrl(value: number) {
  return value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

export default function MeusPedidosPage() {
  const [rows, setRows] = useState<OrderRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      setErr(null);
      const res = await fetch("/api/meus-pedidos");
      const body = (await res.json().catch(() => ({}))) as OrderRow[] | { error?: string };
      if (cancelled) return;
      if (!res.ok) {
        setErr((body as { error?: string }).error || "Erro ao carregar pedidos");
        setRows([]);
      } else {
        setRows(body as OrderRow[]);
      }
      setLoading(false);
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="space-y-6">
      <h1 className="text-base font-black text-black">Meus pedidos pendentes</h1>
      <p className="text-sm font-semibold text-[#233d4d]">
        Pedidos que você criou e ainda têm saldo em aberto. Abra um pedido para
        registrar mais um pagamento.
      </p>

      {err ? (
        <p
          className="rounded-lg border-2 border-red-600 bg-red-50 px-4 py-3 text-sm font-semibold text-red-900 shadow-sm"
          role="alert"
        >
          {err}
        </p>
      ) : null}

      {loading ? (
        <p className="text-[#233d4d]">Carregando…</p>
      ) : rows.length === 0 ? (
        <p className="rounded-[1.4rem] border-2 border-black bg-[#eab660] p-6 text-center font-semibold text-[#233d4d] shadow-[6px_6px_0_#000]">
          Nenhum pedido pendente no momento.
        </p>
      ) : (
        <ul className="space-y-3">
          {rows.map((o) => (
            <li
              key={o.id}
              className="overflow-hidden rounded-[1.4rem] border-2 border-black bg-[#eab660] shadow-[6px_6px_0_#000]"
            >
              <Link href={`/meus-pedidos/${o.id}`} className="block p-4">
                <p className="font-black text-black">
                  #{o.order_id_display} — {o.title}
                </p>
                <p className="mt-1 text-sm font-semibold text-[#233d4d]">
                  Total: <span className="font-black text-black">{fmtBrl(Number(o.total_amount))}</span>
                </p>
                <p className="text-sm font-semibold text-[#233d4d]">
                  Pago: <span className="font-black text-black">{fmtBrl(o.amountPaid)}</span>{" "}
                  · Restante:{" "}
                  <span className="font-black text-black">{fmtBrl(o.remainingBalance)}</span>
                </p>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
