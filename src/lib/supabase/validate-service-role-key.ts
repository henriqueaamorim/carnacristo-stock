/**
 * Valida SUPABASE_SERVICE_ROLE_KEY (formato JWT legado).
 * Chaves novas (sb_secret_...) não são JWT — passam sem checagem de role.
 */
export function assertServiceRoleKey(key: string): void {
  const trimmed = key.trim();
  if (!trimmed) {
    throw new Error("SUPABASE_SERVICE_ROLE_KEY está vazia.");
  }

  if (trimmed.startsWith("sb_secret_")) {
    return;
  }

  const parts = trimmed.split(".");
  if (parts.length !== 3) {
    throw new Error(
      "SUPABASE_SERVICE_ROLE_KEY inválida: use a chave service_role do painel (Settings → API), não a anon/public.",
    );
  }

  try {
    const base64 = parts[1].replace(/-/g, "+").replace(/_/g, "/");
    const payload = JSON.parse(
      Buffer.from(base64, "base64").toString("utf8"),
    ) as { role?: string };

    if (payload.role === "anon") {
      throw new Error(
        "SUPABASE_SERVICE_ROLE_KEY está com a chave anon (publishable). No Supabase: Settings → API → copie a chave service_role (secret), não a anon.",
      );
    }
    if (payload.role !== "service_role") {
      throw new Error(
        `SUPABASE_SERVICE_ROLE_KEY inválida: role="${payload.role ?? "desconhecido"}". Esperado service_role.`,
      );
    }
  } catch (e) {
    if (e instanceof Error && e.message.includes("SUPABASE_SERVICE_ROLE_KEY")) {
      throw e;
    }
    throw new Error(
      "SUPABASE_SERVICE_ROLE_KEY inválida: não foi possível validar o JWT. Confira a chave service_role no painel Supabase.",
    );
  }
}

/** Mensagem amigável quando a API Auth retorna 401 por chave errada. */
export function mapAuthAdminError(message: string): string {
  if (message === "User not allowed") {
    return (
      "Operação negada pelo Supabase Auth: a chave do servidor não é service_role. " +
      "Em .env.local, defina SUPABASE_SERVICE_ROLE_KEY com a chave secreta service_role " +
      "(Settings → API no painel), não com a anon/public. Reinicie o npm run dev."
    );
  }
  return message;
}
