import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/require-admin";
import { createServiceRoleClient } from "@/lib/supabase/service-role";
import { mapAuthAdminError } from "@/lib/supabase/validate-service-role-key";
import type { UserRole } from "@/types";

function parseRole(value: unknown): UserRole | null {
  if (value === "admin" || value === "vendedor") return value;
  return null;
}

export async function GET() {
  const g = await requireAdmin();
  if (!g.ok) return g.response;

  const { data, error } = await g.supabase
    .from("profiles")
    .select("id, email, full_name, role, created_at")
    .order("created_at", { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data ?? []);
}

export async function POST(request: Request) {
  const g = await requireAdmin();
  if (!g.ok) return g.response;

  let adminClient;
  try {
    adminClient = createServiceRoleClient();
  } catch (e) {
    const message =
      e instanceof Error
        ? e.message
        : "Servidor sem SUPABASE_SERVICE_ROLE_KEY válida. Defina no .env.local.";
    const status = message.includes("ausente") || message.includes("vazia") ? 501 : 500;
    return NextResponse.json({ error: message }, { status });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "JSON inválido" }, { status: 400 });
  }

  const b = body as Record<string, unknown>;
  const email = typeof b.email === "string" ? b.email.trim() : "";
  const password = typeof b.password === "string" ? b.password : "";
  const full_name =
    typeof b.full_name === "string" ? b.full_name.trim() : "";
  const role = parseRole(b.role);

  if (!email || !password || !full_name) {
    return NextResponse.json(
      { error: "E-mail, senha e nome são obrigatórios" },
      { status: 400 },
    );
  }
  if (!role) {
    return NextResponse.json(
      { error: "Perfil inválido (use admin ou vendedor)" },
      { status: 400 },
    );
  }
  if (password.length < 6) {
    return NextResponse.json(
      { error: "Senha deve ter ao menos 6 caracteres" },
      { status: 400 },
    );
  }

  const { data: created, error: ce } = await adminClient.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { full_name },
  });

  if (ce || !created.user) {
    return NextResponse.json(
      { error: mapAuthAdminError(ce?.message || "Erro ao criar usuário") },
      { status: ce?.status === 401 ? 403 : 400 },
    );
  }

  const { error: profileErr } = await adminClient.from("profiles").upsert(
    {
      id: created.user.id,
      email: created.user.email,
      full_name,
      role,
    },
    { onConflict: "id" },
  );

  if (profileErr) {
    await adminClient.auth.admin.deleteUser(created.user.id);
    return NextResponse.json({ error: profileErr.message }, { status: 500 });
  }

  return NextResponse.json(
    {
      id: created.user.id,
      email: created.user.email,
      full_name,
      role,
      created_at: new Date().toISOString(),
    },
    { status: 201 },
  );
}
