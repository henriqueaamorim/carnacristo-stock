import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/require-admin";

type Ctx = { params: Promise<{ id: string }> };

export async function POST(_request: Request, ctx: Ctx) {
  const g = await requireAdmin();
  if (!g.ok) return g.response;

  const { id } = await ctx.params;

  const { data, error } = await g.supabase.rpc("cancel_order_with_inventory_refund", {
    p_order_id: id,
  });

  if (error) {
    return NextResponse.json(
      { error: error.message || "Erro ao cancelar" },
      { status: 400 },
    );
  }

  return NextResponse.json(data);
}
