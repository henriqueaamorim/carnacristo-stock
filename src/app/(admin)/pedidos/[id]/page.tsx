"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import type { PaymentMethod } from "@/types";
import { formatOrderStatus } from "@/utils/orderStatus";

const PAYMENTS: PaymentMethod[] = [
  "pix",
  "dinheiro",
  "credito",
  "debito",
  "doacao",
  "parceria",
];

type Item = {
  id: string;
  product_id: string;
  quantity: number;
  unit_price: number;
  subtotal: number;
  product_name: string | null;
};

type ProductOpt = { id: string; name: string; price: number; stock_quantity: number };

export default function AdminPedidoDetalhePage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const [order, setOrder] = useState<{
    id: string;
    order_id_display: string;
    title: string;
    payment_method: PaymentMethod;
    total_amount: number;
    status: string;
    created_at: string;
    seller_id: string;
  } | null>(null);
  const [seller, setSeller] = useState<{ email: string | null } | null>(null);
  const [items, setItems] = useState<Item[]>([]);
  const [products, setProducts] = useState<ProductOpt[]>([]);

  const [editTitle, setEditTitle] = useState("");
  const [editPay, setEditPay] = useState<PaymentMethod>("pix");
  const [editLines, setEditLines] = useState<{ productId: string; quantity: number }[]>(
    [],
  );
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    setErr(null);
    const res = await fetch(`/api/pedidos/${id}`);
    const body = (await res.json().catch(() => ({}))) as {
      error?: string;
      order?: typeof order;
      seller?: typeof seller;
      items?: Item[];
    };
    if (!res.ok) {
      setErr(body.error || "Erro ao carregar");
      setOrder(null);
      setItems([]);
    } else {
      setOrder(body.order ?? null);
      setSeller(body.seller ?? null);
      setItems(body.items ?? []);
      if (body.order) {
        setEditTitle(body.order.title);
        setEditPay(body.order.payment_method);
        setEditLines(
          (body.items ?? []).map((i) => ({
            productId: i.product_id,
            quantity: i.quantity,
          })),
        );
      }
    }
    const pr = await fetch("/api/produtos");
    const prBody = (await pr.json().catch(() => [])) as ProductOpt[];
    if (pr.ok) setProducts(prBody);
    setLoading(false);
  }, [id]);

  useEffect(() => {
    void load();
  }, [load]);

  async function cancelar() {
    if (!id || !confirm("Cancelar pedido e devolver estoque?")) return;
    setBusy(true);
    setErr(null);
    setMsg(null);
    const res = await fetch(`/api/pedidos/${id}/cancelar`, { method: "POST" });
    const body = (await res.json().catch(() => ({}))) as { error?: string };
    if (!res.ok) setErr(body.error || "Erro ao cancelar");
    else {
      setMsg("Pedido cancelado.");
      await load();
    }
    setBusy(false);
  }

  async function salvarEdicao(e: React.FormEvent) {
    e.preventDefault();
    if (!id) return;
    setBusy(true);
    setErr(null);
    setMsg(null);
    const res = await fetch(`/api/pedidos/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: editTitle,
        paymentMethod: editPay,
        items: editLines.filter((l) => l.productId && l.quantity > 0),
      }),
    });
    const body = (await res.json().catch(() => ({}))) as { error?: string };
    if (!res.ok) setErr(body.error || "Erro ao salvar edição");
    else {
      setMsg("Pedido atualizado.");
      await load();
      router.refresh();
    }
    setBusy(false);
  }

  function addLine() {
    const first = products[0];
    setEditLines((prev) => [
      ...prev,
      { productId: first?.id ?? "", quantity: 1 },
    ]);
  }

  if (loading) return <p className="text-[#233d4d]">Carregando…</p>;
  if (!order) {
    return (
      <div>
        <p className="text-red-400">{err || "Pedido não encontrado"}</p>
        <Link href="/pedidos" className="text-[#233d4d] hover:underline">
          Voltar
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-[1.4rem] border-2 border-black bg-[#eab660] p-4 shadow-[6px_6px_0_#000]">
        <div>
          <Link href="/pedidos" className="text-sm font-black text-[#233d4d] hover:underline">
            ← Pedidos
          </Link>
          <h1 className="mt-2 text-xl font-black text-black">
            Pedido #{order.order_id_display}
          </h1>
          <p className="text-sm text-[#233d4d]">
            Vendedor: {seller?.email ?? order.seller_id} · {formatOrderStatus(order.status)}
          </p>
        </div>
        {order.status === "completed" ? (
          <button
            type="button"
            disabled={busy}
            onClick={() => void cancelar()}
            className="rounded-lg border-2 border-black bg-[#f7b3a9] px-4 py-2 text-sm font-black text-black disabled:opacity-50"
          >
            Cancelar pedido
          </button>
        ) : null}
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
        <h2 className="mb-2 font-black text-black">Itens atuais</h2>
        <ul className="space-y-1 text-sm text-[#233d4d]">
          {items.map((i) => (
            <li key={i.id}>
              {i.product_name ?? i.product_id} × {i.quantity} —{" "}
              {Number(i.subtotal).toLocaleString("pt-BR", {
                style: "currency",
                currency: "BRL",
              })}
            </li>
          ))}
        </ul>
        <p className="mt-3 text-lg font-black text-black">
          Total:{" "}
          {Number(order.total_amount).toLocaleString("pt-BR", {
            style: "currency",
            currency: "BRL",
          })}
        </p>
      </section>

      {order.status === "completed" ? (
        <section className="overflow-hidden rounded-[1.4rem] border-2 border-black bg-[#eab660] shadow-[6px_6px_0_#000]">
          <div className="border-b-2 border-black bg-[#ea5342] px-4 py-3">
            <h2 className="font-black uppercase tracking-wide text-black">
              Editar pedido (estoque recalculado)
            </h2>
          </div>
          <form onSubmit={salvarEdicao} className="space-y-4 p-6">
            <label className="block text-sm font-black text-black">
              Título
              <input
                value={editTitle}
                onChange={(e) => setEditTitle(e.target.value)}
                className="mt-1 w-full rounded-lg border-2 border-black bg-[#fff4e8] px-3 py-2 text-[#233d4d]"
              />
            </label>
            <label className="block text-sm font-black text-black">
              Pagamento
              <select
                value={editPay}
                onChange={(e) => setEditPay(e.target.value as PaymentMethod)}
                className="mt-1 w-full rounded-lg border-2 border-black bg-[#fff4e8] px-3 py-2 text-[#233d4d]"
              >
                {PAYMENTS.map((p) => (
                  <option key={p} value={p}>
                    {p}
                  </option>
                ))}
              </select>
            </label>
            <div>
              <div className="mb-2 flex items-center justify-between">
                <span className="text-sm font-black text-black">Itens</span>
                <button
                  type="button"
                  onClick={addLine}
                  className="rounded border-2 border-black bg-[#fff4e8] px-2 py-1 text-xs font-black text-black"
                >
                  + linha
                </button>
              </div>
              <div className="space-y-2">
                {editLines.map((line, idx) => (
                  <div key={idx} className="flex flex-wrap gap-2">
                    <select
                      value={line.productId}
                      onChange={(e) => {
                        const v = e.target.value;
                        setEditLines((prev) =>
                          prev.map((l, i) => (i === idx ? { ...l, productId: v } : l)),
                        );
                      }}
                      className="min-w-[180px] flex-1 rounded-lg border-2 border-black bg-[#fff4e8] px-2 py-2 text-[#233d4d]"
                    >
                      <option value="">— produto —</option>
                      {products.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.name} (est: {p.stock_quantity})
                        </option>
                      ))}
                    </select>
                    <input
                      type="number"
                      min={1}
                      value={line.quantity}
                      onChange={(e) => {
                        const q = Math.max(1, Number(e.target.value) || 1);
                        setEditLines((prev) =>
                          prev.map((l, i) => (i === idx ? { ...l, quantity: q } : l)),
                        );
                      }}
                      className="w-24 rounded-lg border-2 border-black bg-[#fff4e8] px-2 py-2 text-[#233d4d]"
                    />
                    <button
                      type="button"
                      className="rounded border-2 border-black px-2 py-1 text-xs font-black text-[#ea5342]"
                      onClick={() =>
                        setEditLines((prev) => prev.filter((_, i) => i !== idx))
                      }
                    >
                      remover
                    </button>
                  </div>
                ))}
              </div>
            </div>
            <button
              type="submit"
              disabled={busy || editLines.length === 0}
              className="rounded-lg border-2 border-black bg-[#abcf85] px-4 py-2 font-black text-black disabled:opacity-50"
            >
              Salvar edição
            </button>
          </form>
        </section>
      ) : null}
    </div>
  );
}
