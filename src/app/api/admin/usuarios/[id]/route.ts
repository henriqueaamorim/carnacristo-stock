import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/require-admin";
import { createServiceRoleClient } from "@/lib/supabase/service-role";
import { mapAuthAdminError } from "@/lib/supabase/validate-service-role-key";
type RouteContext = { params: Promise<{ id: string }> };

function getServiceRoleOr501() {
  try {
    return { client: createServiceRoleClient(), error: null as NextResponse | null };
  } catch {
    return {
      client: null,
      error: NextResponse.json(
        {
          error:
            "Servidor sem SUPABASE_SERVICE_ROLE_KEY. Defina no .env.local para gerenciar usuários.",
        },
        { status: 501 },
      ),
    };
  }
}

export async function PATCH(request: Request, context: RouteContext) {
  const g = await requireAdmin();
  if (!g.ok) return g.response;

  const { id } = await context.params;
  if (!id) {
    return NextResponse.json({ error: "ID inválido" }, { status: 400 });
  }

  const sr = getServiceRoleOr501();
  if (sr.error) return sr.error;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "JSON inválido" }, { status: 400 });
  }

  const b = body as Record<string, unknown>;
  const full_name =
    typeof b.full_name === "string" ? b.full_name.trim() : undefined;
  const password = typeof b.password === "string" ? b.password : "";

  if (full_name !== undefined && !full_name) {
    return NextResponse.json({ error: "Nome é obrigatório" }, { status: 400 });
  }

  if (password && password.length < 6) {
    return NextResponse.json(
      { error: "Senha deve ter ao menos 6 caracteres" },
      { status: 400 },
    );
  }

  const { data: existing, error: fetchErr } = await g.supabase
    .from("profiles")
    .select("id")
    .eq("id", id)
    .single();

  if (fetchErr || !existing) {
    return NextResponse.json({ error: "Usuário não encontrado" }, { status: 404 });
  }

  if (full_name !== undefined) {
    const { error: profileErr } = await sr.client!
      .from("profiles")
      .update({ full_name })
      .eq("id", id);

    if (profileErr) {
      return NextResponse.json({ error: profileErr.message }, { status: 500 });
    }

    await sr.client!.auth.admin.updateUserById(id, {
      user_metadata: { full_name },
    });
  }

  if (password) {
    const { error: pwErr } = await sr.client!.auth.admin.updateUserById(id, {
      password,
    });
    if (pwErr) {
      return NextResponse.json({ error: pwErr.message }, { status: 400 });
    }
  }

  const { data: updated, error: readErr } = await g.supabase
    .from("profiles")
    .select("id, email, full_name, role, created_at")
    .eq("id", id)
    .single();

  if (readErr || !updated) {
    return NextResponse.json({ error: readErr?.message || "Erro ao ler perfil" }, { status: 500 });
  }

  return NextResponse.json(updated);
}

export async function DELETE(_request: Request, context: RouteContext) {
  const g = await requireAdmin();
  if (!g.ok) return g.response;

  const { id } = await context.params;
  if (!id) {
    return NextResponse.json({ error: "ID inválido" }, { status: 400 });
  }

  if (id === g.userId) {
    return NextResponse.json(
      { error: "Você não pode excluir sua própria conta" },
      { status: 400 },
    );
  }

  const sr = getServiceRoleOr501();
  if (sr.error) return sr.error;

  const { data: existing, error: fetchErr } = await g.supabase
    .from("profiles")
    .select("id, role")
    .eq("id", id)
    .single();

  if (fetchErr || !existing) {
    return NextResponse.json({ error: "Usuário não encontrado" }, { status: 404 });
  }

  const { error: delErr } = await sr.client!.auth.admin.deleteUser(id);
  if (delErr) {
    let msg = mapAuthAdminError(delErr.message);
    if (delErr.message.includes("foreign key")) {
      msg = "Não é possível excluir: usuário possui pedidos vinculados.";
    }
    return NextResponse.json(
      { error: msg },
      { status: delErr.status === 401 ? 403 : 400 },
    );
  }

  return NextResponse.json({ ok: true });
}
