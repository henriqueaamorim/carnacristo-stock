import { createBrowserClient } from "@supabase/ssr";

export function createClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim();

  if (!url || !key) {
    throw new Error(
      "Configuração ausente: defina NEXT_PUBLIC_SUPABASE_URL e NEXT_PUBLIC_SUPABASE_ANON_KEY em .env.local na raiz do projeto e reinicie o servidor (npm run dev).",
    );
  }

  if (!url.startsWith("http")) {
    throw new Error(
      "NEXT_PUBLIC_SUPABASE_URL inválida: deve começar com https:// (ex.: https://xxxx.supabase.co).",
    );
  }

  try {
    const parsed = new URL(url);
    if (parsed.pathname.replace(/\/$/, "") !== "") {
      throw new Error(
        "NEXT_PUBLIC_SUPABASE_URL deve ser só a URL raiz do projeto (ex.: https://xxxx.supabase.co), sem /rest/v1 ou outros caminhos.",
      );
    }
  } catch (e) {
    if (e instanceof Error && e.message.includes("NEXT_PUBLIC_SUPABASE_URL deve")) throw e;
    throw new Error("NEXT_PUBLIC_SUPABASE_URL inválida: URL malformada.");
  }

  return createBrowserClient(url, key);
}
