"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { BrlPriceInput } from "@/components/BrlPriceInput";
import { PaymentMethodSelector } from "@/components/PaymentMethodSelector";
import type { PaymentMethod } from "@/types";
import { formatOrderStatus } from "@/utils/orderStatus";

type Item = {
  id: string;
  product_id: string;
  quantity: number;
  unit_price: number;
  subtotal: number;
  product_name: string | null;
};

type Payment = {
  id: string;
  amount: number;
  payment_method: PaymentMethod;
  created_at: string;
};

function fmtBrl(value: number) {
  return value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

export default function MeuPedidoDetalhePage() {
  const { id } = useParams<{ id: string }>();
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const [order, setOrder] = useState<{
    id: string;
    order_id_display: string;
    title: string;
    total_amount: number;
    status: string;
  } | null>(null);
  const [items, setItems] = useState<Item[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [amountPaid, setAmountPaid] = useState(0);
  const [remainingBalance, setRemainingBalance] = useState(0);

  const [payAmount, setPayAmount] = useState<number | null>(null);
  const [payMethod, setPayMethod] = useState<PaymentMethod | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    setErr(null);
    const res = await fetch(`/api/pedidos/${id}`);
    const body = (await res.json().catch(() => ({}))) as {
      error?: string;
      order?: typeof order;
      items?: Item[];
      payments?: Payment[];
      amountPaid?: number;
      remainingBalance?: number;
    };
    if (!res.ok) {
      setErr(body.error || "Erro ao carregar pedido");
      setOrder(null);
      setItems([]);
      setPayments([]);
    } else {
      setOrder(body.order ?? null);
      setItems(body.items ?? []);
      setPayments(body.payments ?? []);
      setAmountPaid(body.amountPaid ?? 0);
      setRemainingBalance(body.remainingBalance ?? 0);
    }
    setLoading(false);
  }, [id]);

  useEffect(() => {
    void load();
  }, [load]);

  async function registrarPagamento(e: React.FormEvent) {
    e.preventDefault();
    if (!id) return;
    if (!payMethod) {
      setErr("Selecione a forma de pagamento.");
      return;
    }
    if (payAmount == null || payAmount <= 0) {
      setErr("Informe o valor pago.");
      return;
    }
    if (payAmount > remainingBalance) {
      setErr("O valor não pode ser maior que o saldo restante.");
      return;
    }
    setBusy(true);
    setErr(null);
    setMsg(null);
    const res = await fetch(`/api/pedidos/${id}/pagamentos`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ amount: payAmount, paymentMethod: payMethod }),
    });
    const body = (await res.json().catch(() => ({}))) as { error?: string; status?: string };
    if (!res.ok) {
      setErr(body.error || "Erro ao registrar pagamento");
    } else {
      setMsg(
        body.status === "completed"
          ? "Pagamento registrado. Pedido finalizado!"
          : "Pagamento registrado. Ainda há saldo pendente.",
      );
      setPayAmount(null);
      setPayMethod(null);
      await load();
    }
    setBusy(false);
  }

  if (loading) return <p className="text-[#233d4d]">Carregando…</p>;
  if (!order) {
    return (
      <div>
        <p className="text-red-600">{err || "Pedido não encontrado"}</p>
        <Link href="/meus-pedidos" className="text-[#233d4d] hover:underline">
          Voltar
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <Link href="/meus-pedidos" className="text-sm font-black text-[#233d4d] hover:underline">
          ← Meus pedidos
        </Link>
        <h1 className="mt-2 text-xl font-black text-black">
          Pedido #{order.order_id_display}
        </h1>
        <p className="text-sm text-[#233d4d]">{formatOrderStatus(order.status)}</p>
      </div>

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

      <section className="rounded-[1.4rem] border-2 border-black bg-[#eab660] p-4 shadow-[6px_6px_0_#000]">
        <h2 className="mb-2 font-black text-black">Itens</h2>
        <ul className="space-y-1 text-sm text-[#233d4d]">
          {items.map((i) => (
            <li key={i.id}>
              {i.product_name ?? i.product_id} × {i.quantity} — {fmtBrl(Number(i.subtotal))}
            </li>
          ))}
        </ul>
        <p className="mt-3 text-lg font-black text-black">
          Total: {fmtBrl(Number(order.total_amount))}
        </p>
        <p className="text-sm font-semibold text-[#233d4d]">
          Pago: <span className="font-black text-black">{fmtBrl(amountPaid)}</span> · Restante:{" "}
          <span className="font-black text-black">{fmtBrl(remainingBalance)}</span>
        </p>
      </section>

      {payments.length > 0 ? (
        <section className="rounded-[1.4rem] border-2 border-black bg-[#eab660] p-4 shadow-[6px_6px_0_#000]">
          <h2 className="mb-2 font-black text-black">Pagamentos registrados</h2>
          <ul className="space-y-1 text-sm text-[#233d4d]">
            {payments.map((p) => (
              <li key={p.id}>
                {fmtBrl(Number(p.amount))} — {p.payment_method} —{" "}
                {new Date(p.created_at).toLocaleString("pt-BR")}
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {order.status === "pending" && remainingBalance > 0 ? (
        <section className="overflow-hidden rounded-[1.4rem] border-2 border-black bg-[#eab660] shadow-[6px_6px_0_#000]">
          <div className="border-b-2 border-black bg-[#ea5342] px-4 py-3">
            <h2 className="font-black uppercase tracking-wide text-black">
              Registrar pagamento
            </h2>
          </div>
          <form onSubmit={registrarPagamento} className="space-y-4 p-6">
            <label className="block text-sm font-black text-black">
              Valor pago
              <BrlPriceInput
                name="amount"
                onAmountChange={setPayAmount}
                className="mt-1 w-full rounded-lg border-2 border-black bg-[#fff4e8] px-3 py-2 text-[#233d4d]"
              />
            </label>
            <PaymentMethodSelector value={payMethod} onChange={setPayMethod} />
            <button
              type="submit"
              disabled={busy}
              className="rounded-lg border-2 border-black bg-[#abcf85] px-4 py-2 font-black text-black disabled:opacity-50"
            >
              {busy ? "Processando…" : "Registrar pagamento"}
            </button>
          </form>
        </section>
      ) : null}
    </div>
  );
}
