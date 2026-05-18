import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import type { ProductDTO } from "@/types";
import { requireAdmin } from "@/lib/require-admin";

async function signOne(
  supabase: Awaited<ReturnType<typeof createClient>>,
  row: {
    id: string;
    name: string;
    description: string | null;
    price: number;
    stock_quantity: number;
    image_path: string | null;
    created_at: string;
  },
): Promise<ProductDTO> {
  let imageSignedUrl: string | null = null;
  if (row.image_path) {
    const { data } = await supabase.storage
      .from("products")
      .createSignedUrl(row.image_path, 3600);
    imageSignedUrl = data?.signedUrl ?? null;
  }
  return { ...row, imageSignedUrl };
}

type Ctx = { params: Promise<{ id: string }> };

export async function GET(_request: Request, ctx: Ctx) {
  const admin = await requireAdmin();
  if (!admin.ok) return admin.response;

  const { id } = await ctx.params;
  const { data, error } = await admin.supabase
    .from("products")
    .select("id,name,description,price,stock_quantity,image_path,created_at")
    .eq("id", id)
    .maybeSingle();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  if (!data) {
    return NextResponse.json({ error: "Produto não encontrado" }, { status: 404 });
  }

  const dto = await signOne(admin.supabase, data);
  return NextResponse.json(dto);
}

export async function PATCH(request: Request, ctx: Ctx) {
  const admin = await requireAdmin();
  if (!admin.ok) return admin.response;

  const { id } = await ctx.params;
  const contentType = request.headers.get("content-type") ?? "";

  if (contentType.includes("multipart/form-data")) {
    const form = await request.formData();
    const name = form.has("name") ? String(form.get("name")).trim() : undefined;
    const description = form.has("description")
      ? String(form.get("description")).trim()
      : undefined;
    const priceRaw = form.get("price");
    const stockRaw = form.get("stock_quantity");
    const file = form.get("file");

    const updates: Record<string, unknown> = {};
    if (name !== undefined && name !== "") updates.name = name;
    if (description !== undefined) updates.description = description || null;
    if (priceRaw != null && String(priceRaw) !== "") {
      const price = Number(priceRaw);
      if (!Number.isFinite(price) || price <= 0) {
        return NextResponse.json({ error: "Preço inválido" }, { status: 400 });
      }
      updates.price = price;
    }
    if (stockRaw != null && String(stockRaw) !== "") {
      const stock_quantity = Number(stockRaw);
      if (!Number.isInteger(stock_quantity) || stock_quantity < 0) {
        return NextResponse.json({ error: "Estoque inválido" }, { status: 400 });
      }
      updates.stock_quantity = stock_quantity;
    }

    if (file instanceof File && file.size > 0) {
      if (file.size > 5 * 1024 * 1024) {
        return NextResponse.json(
          { error: "Imagem máxima 5MB" },
          { status: 400 },
        );
      }
      const ext = file.name.split(".").pop()?.toLowerCase() ?? "jpg";
      const image_path = `${id}/cover.${ext}`;
      const buf = Buffer.from(await file.arrayBuffer());
      const { error: upErr } = await admin.supabase.storage
        .from("products")
        .upload(image_path, buf, {
          contentType: file.type || "image/jpeg",
          upsert: true,
        });
      if (upErr) {
        return NextResponse.json({ error: upErr.message }, { status: 400 });
      }
      updates.image_path = image_path;
    }

    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ error: "Nada para atualizar" }, { status: 400 });
    }

    const { data, error } = await admin.supabase
      .from("products")
      .update(updates)
      .eq("id", id)
      .select("id,name,description,price,stock_quantity,image_path,created_at")
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    return NextResponse.json(await signOne(admin.supabase, data));
  }

  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: "JSON inválido" }, { status: 400 });
  }

  const updates: Record<string, unknown> = {};
  if (typeof body.name === "string" && body.name.trim()) updates.name = body.name.trim();
  if (typeof body.description === "string")
    updates.description = body.description.trim() || null;
  if (body.price != null) {
    const price = Number(body.price);
    if (!Number.isFinite(price) || price <= 0) {
      return NextResponse.json({ error: "Preço inválido" }, { status: 400 });
    }
    updates.price = price;
  }
  if (body.stock_quantity != null) {
    const stock_quantity = Number(body.stock_quantity);
    if (!Number.isInteger(stock_quantity) || stock_quantity < 0) {
      return NextResponse.json({ error: "Estoque inválido" }, { status: 400 });
    }
    updates.stock_quantity = stock_quantity;
  }

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: "Nada para atualizar" }, { status: 400 });
  }

  const { data, error } = await admin.supabase
    .from("products")
    .update(updates)
    .eq("id", id)
    .select("id,name,description,price,stock_quantity,image_path,created_at")
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json(await signOne(admin.supabase, data));
}

export async function DELETE(_request: Request, ctx: Ctx) {
  const admin = await requireAdmin();
  if (!admin.ok) return admin.response;

  const { id } = await ctx.params;

  const { data: row } = await admin.supabase
    .from("products")
    .select("image_path")
    .eq("id", id)
    .maybeSingle();

  if (!row) {
    return NextResponse.json({ error: "Produto não encontrado" }, { status: 404 });
  }

  const { error } = await admin.supabase.from("products").delete().eq("id", id);

  if (error) {
    if (error.code === "23503") {
      return NextResponse.json(
        { error: "Não é possível excluir: produto vinculado a pedidos." },
        { status: 409 },
      );
    }
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  if (row.image_path) {
    await admin.supabase.storage.from("products").remove([row.image_path]);
  }

  return NextResponse.json({ ok: true });
}
