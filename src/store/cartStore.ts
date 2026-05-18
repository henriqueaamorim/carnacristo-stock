import { create } from "zustand";
import type { ProductDTO } from "@/types";

export type CartLine = {
  productId: string;
  name: string;
  unitPrice: number;
  quantity: number;
  /** Último estoque conhecido no servidor (para validação UX). */
  maxStock: number;
};

type CartState = {
  orderTitle: string;
  lines: CartLine[];
  setOrderTitle: (t: string) => void;
  setLineQty: (productId: string, quantity: number) => void;
  addOrIncrement: (p: ProductDTO, delta: number) => void;
  removeLine: (productId: string) => void;
  clear: () => void;
  /** Reconcilia estoque vindo do servidor sem apagar itens arbitrariamente. */
  reconcileFromProducts: (products: ProductDTO[]) => void;
};

export const useCartStore = create<CartState>((set, get) => ({
  orderTitle: "",
  lines: [],
  setOrderTitle: (orderTitle) => set({ orderTitle }),
  setLineQty: (productId, quantity) => {
    const q = Math.max(0, Math.floor(quantity));
    set({
      lines: get().lines.map((l) =>
        l.productId === productId
          ? { ...l, quantity: Math.min(q, l.maxStock) }
          : l,
      ),
    });
  },
  addOrIncrement: (p, delta) => {
    const stock = p.stock_quantity;
    if (stock <= 0) return;
    const lines = get().lines;
    const idx = lines.findIndex((l) => l.productId === p.id);
    if (idx === -1) {
      if (delta > 0) {
        const q = Math.min(delta, stock);
        if (q <= 0) return;
        set({
          lines: [
            ...lines,
            {
              productId: p.id,
              name: p.name,
              unitPrice: Number(p.price),
              quantity: q,
              maxStock: stock,
            },
          ],
        });
      }
      return;
    }
    const cur = lines[idx]!;
    const nextQty = cur.quantity + delta;
    if (nextQty <= 0) {
      set({ lines: lines.filter((_, i) => i !== idx) });
      return;
    }
    if (nextQty > stock) return;
    const copy = [...lines];
    copy[idx] = { ...cur, quantity: nextQty, maxStock: stock, unitPrice: Number(p.price) };
    set({ lines: copy });
  },
  removeLine: (productId) =>
    set({ lines: get().lines.filter((l) => l.productId !== productId) }),
  clear: () => set({ lines: [], orderTitle: "" }),
  reconcileFromProducts: (products) => {
    const map = new Map(products.map((p) => [p.id, p]));
    set({
      lines: get().lines
        .map((l) => {
          const p = map.get(l.productId);
          if (!p) return l;
          const maxStock = p.stock_quantity;
          const quantity = Math.min(l.quantity, maxStock);
          return {
            ...l,
            maxStock,
            quantity,
            unitPrice: Number(p.price),
          };
        })
        .filter((l) => l.quantity > 0 && l.maxStock > 0),
    });
  },
}));

export function cartLinesToPayload(lines: CartLine[]) {
  return lines.map((l) => ({
    productId: l.productId,
    quantity: l.quantity,
  }));
}

export function cartTotal(lines: CartLine[]) {
  return lines.reduce((s, l) => s + l.unitPrice * l.quantity, 0);
}
