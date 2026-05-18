import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  }

  const { data: row, error } = await supabase
    .from("pix_settings")
    .select("id, qr_code_image_path, description, is_active")
    .eq("is_active", true)
    .maybeSingle();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  if (!row) {
    return NextResponse.json({
      configured: false,
      signedUrl: null,
      description: null,
    });
  }

  const { data: signed } = await supabase.storage
    .from("pix")
    .createSignedUrl(row.qr_code_image_path, 3600);

  return NextResponse.json({
    configured: true,
    signedUrl: signed?.signedUrl ?? null,
    description: row.description,
  });
}

export async function PUT(request: Request) {
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
  const file = form.get("file");
  const description = String(form.get("description") ?? "").trim();

  if (!(file instanceof File) || file.size === 0) {
    return NextResponse.json({ error: "Arquivo obrigatório" }, { status: 400 });
  }

  if (file.size > 2 * 1024 * 1024) {
    return NextResponse.json(
      { error: "Arquivo máximo 2MB" },
      { status: 400 },
    );
  }

  const ext = file.name.split(".").pop()?.toLowerCase();
  if (ext && !["png", "jpg", "jpeg", "webp"].includes(ext)) {
    return NextResponse.json(
      { error: "Formato permitido: PNG, JPG, WEBP" },
      { status: 400 },
    );
  }

  const path = `active/${user.id}/${Date.now()}.${ext ?? "png"}`;

  const buf = Buffer.from(await file.arrayBuffer());
  const { error: upErr } = await supabase.storage
    .from("pix")
    .upload(path, buf, {
      contentType: file.type || "image/png",
      upsert: true,
    });

  if (upErr) {
    return NextResponse.json({ error: upErr.message }, { status: 400 });
  }

  await supabase
    .from("pix_settings")
    .update({ is_active: false })
    .eq("is_active", true);

  const { error: insErr } = await supabase.from("pix_settings").insert({
    qr_code_image_path: path,
    description: description || null,
    is_active: true,
    updated_by: user.id,
  });

  if (insErr) {
    return NextResponse.json({ error: insErr.message }, { status: 400 });
  }

  return NextResponse.json({ ok: true, path });
}
