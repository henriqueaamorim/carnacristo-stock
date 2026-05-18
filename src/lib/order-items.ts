import { NextResponse } from "next/server";
import type { OrderItemInput } from "@/types";

const PAYMENT = [
  "pix",
  "dinheiro",
  "credito",
  "debito",
  "doacao",
  "parceria",
] as const;

export type PaymentMethodStr = (typeof PAYMENT)[number];

export function isPaymentMethod(v: unknown): v is PaymentMethodStr {
  return typeof v === "string" && (PAYMENT as readonly string[]).includes(v);
}

export function parseOrderItems(
  items: unknown,
): { ok: true; items: OrderItemInput[] } | { ok: false; response: NextResponse } {
  if (!Array.isArray(items) || items.length === 0) {
    return {
      ok: false,
      response: NextResponse.json(
        { error: "Itens do pedido obrigatórios" },
        { status: 400 },
      ),
    };
  }

  const normalized: OrderItemInput[] = [];
  for (const row of items) {
    if (
      typeof row !== "object" ||
      row === null ||
      !("productId" in row) ||
      !("quantity" in row)
    ) {
      return {
        ok: false,
        response: NextResponse.json({ error: "Item inválido" }, { status: 400 }),
      };
    }
    const productId = String((row as { productId: unknown }).productId);
    const quantity = Number((row as { quantity: unknown }).quantity);
    if (!Number.isInteger(quantity) || quantity <= 0) {
      return {
        ok: false,
        response: NextResponse.json(
          { error: "Quantidade inválida" },
          { status: 400 },
        ),
      };
    }
    normalized.push({ productId, quantity });
  }

  return { ok: true, items: normalized };
}
