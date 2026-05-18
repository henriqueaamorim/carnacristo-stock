import { randomUUID } from "node:crypto";
import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import type { ProductDTO } from "@/types";

async function signProductImages(
  supabase: Awaited<ReturnType<typeof createClient>>,
  rows: {
    id: string;
    name: string;
    description: string | null;
    price: number;
    stock_quantity: number;
    image_path: string | null;
    created_at: string;
  }[],
): Promise<ProductDTO[]> {
  const out: ProductDTO[] = [];
  for (const row of rows) {
    let imageSignedUrl: string | null = null;
    if (row.image_path) {
      const { data } = await supabase.storage
        .from("products")
        .createSignedUrl(row.image_path, 3600);
      imageSignedUrl = data?.signedUrl ?? null;
    }
    out.push({ ...row, imageSignedUrl });
  }
  return out;
}

export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  }

  const { data, error } = await supabase
    .from("products")
    .select("id,name,description,price,stock_quantity,image_path,created_at")
    .order("name");

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const payload = await signProductImages(supabase, data ?? []);
  return NextResponse.json(payload);
}

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  }

  const { data: profile, error: pe } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (pe || profile?.role !== "admin") {
    return NextResponse.json({ error: "Acesso negado" }, { status: 403 });
  }

  const contentType = request.headers.get("content-type") ?? "";
  if (!contentType.includes("multipart/form-data")) {
    return NextResponse.json(
      { error: "Use multipart/form-data" },
      { status: 400 },
    );
  }

  const form = await request.formData();
  const name = String(form.get("name") ?? "").trim();
  const description = String(form.get("description") ?? "").trim();
  const price = Number(form.get("price"));
  const stock_quantity = Number(form.get("stock_quantity"));
  const file = form.get("file");

  if (!name) {
    return NextResponse.json({ error: "Nome obrigatório" }, { status: 400 });
  }
  if (!Number.isFinite(price) || price <= 0) {
    return NextResponse.json({ error: "Preço inválido" }, { status: 400 });
  }
  if (!Number.isInteger(stock_quantity) || stock_quantity < 0) {
    return NextResponse.json({ error: "Estoque inválido" }, { status: 400 });
  }

  const productId = randomUUID();
  let image_path: string | null = null;

  if (file instanceof File && file.size > 0) {
    if (file.size > 5 * 1024 * 1024) {
      return NextResponse.json(
        { error: "Imagem máxima 5MB" },
        { status: 400 },
      );
    }
    const ext = file.name.split(".").pop()?.toLowerCase() ?? "jpg";
    image_path = `${productId}/cover.${ext}`;
    const buf = Buffer.from(await file.arrayBuffer());
    const { error: upErr } = await supabase.storage
      .from("products")
      .upload(image_path, buf, {
        contentType: file.type || "image/jpeg",
        upsert: true,
      });
    if (upErr) {
      return NextResponse.json({ error: upErr.message }, { status: 400 });
    }
  }

  const { data: inserted, error: insErr } = await supabase
    .from("products")
    .insert({
      id: productId,
      name,
      description: description || null,
      price,
      stock_quantity,
      image_path,
      created_by: user.id,
    })
    .select("id,name,description,price,stock_quantity,image_path,created_at")
    .single();

  if (insErr) {
    return NextResponse.json({ error: insErr.message }, { status: 400 });
  }

  const [dto] = await signProductImages(supabase, inserted ? [inserted] : []);
  return NextResponse.json(dto, { status: 201 });
}
