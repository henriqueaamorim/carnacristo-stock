"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const supabase = createClient();
    const { error: err } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    });
    setLoading(false);
    if (err) {
      setError(err.message);
      return;
    }
    router.push("/");
    router.refresh();
  }

  return (
    <div className="mx-auto flex min-h-screen max-w-sm flex-col justify-center px-4">
      <h1 className="mb-6 text-center text-2xl font-bold text-[#233d4d]">
        Carnacristo Stock
      </h1>
      <form
        onSubmit={onSubmit}
        className="overflow-hidden rounded-[1.4rem] border-2 border-black bg-[#eab660] shadow-[6px_6px_0_#000]"
      >
        <div className="flex items-center justify-between border-b-2 border-black bg-[#ea5342] px-4 py-3">
          <span className="text-base font-black uppercase tracking-wide text-black">Login</span>
          <div className="flex items-center gap-2">
            <span className="h-3 w-3 rounded-full border-2 border-black bg-[#f8dcc0]" aria-hidden="true" />
            <span className="h-3 w-3 rounded-full border-2 border-black bg-[#f8dcc0]" aria-hidden="true" />
          </div>
        </div>

        <div className="space-y-4 p-6">
          <label className="block text-sm font-bold text-black">
            E-mail
            <input
              type="email"
              autoComplete="email"
              required
              className="mt-2 w-full rounded-xl border-2 border-black bg-[#fff4e8] px-3 py-2 text-[#233333] shadow-[3px_3px_0_#000] outline-none transition focus:translate-x-[1px] focus:translate-y-[1px] focus:shadow-[2px_2px_0_#000]"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </label>
          <label className="block text-sm font-bold text-black">
            Senha
            <input
              type="password"
              autoComplete="current-password"
              required
              className="mt-2 w-full rounded-xl border-2 border-black bg-[#fff4e8] px-3 py-2 text-[#233d4d] shadow-[3px_3px_0_#000] outline-none transition focus:translate-x-[1px] focus:translate-y-[1px] focus:shadow-[2px_2px_0_#000]"
              onChange={(e) => setPassword(e.target.value)}
            />
          </label>
          {error ? (
            <p
              className="rounded-xl border-2 border-black bg-[#f7b3a9] px-3 py-2 text-sm font-semibold text-black shadow-[3px_3px_0_#000]"
              role="alert"
            >
              {error}
            </p>
          ) : null}
          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-xl border-2 border-black bg-[#f7f3ea] py-2 font-black text-black shadow-[4px_4px_0_#000] transition hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-[3px_3px_0_#000] disabled:opacity-50"
          >
            {loading ? "Entrando…" : "Entrar"}
          </button>
        </div>
      </form>
    </div>
  );
}
