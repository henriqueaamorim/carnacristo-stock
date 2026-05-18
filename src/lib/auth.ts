import { createClient } from "@/lib/supabase/server";
import type { UserRole } from "@/types";

export async function getSessionWithProfile(): Promise<{
  user: { id: string; email?: string | null };
  role: UserRole;
  fullName: string | null;
} | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  const { data: profile, error } = await supabase
    .from("profiles")
    .select("role, full_name")
    .eq("id", user.id)
    .single();

  if (process.env.NODE_ENV === "development" && error) {
    if (error.code === "PGRST116") {
      console.warn(
        "[getSessionWithProfile] profiles:",
        "code=PGRST116 (0 ou várias linhas para .single — típico: RLS ocultou a linha ou JWT sem auth.uid)",
      );
    } else {
      console.error("[getSessionWithProfile] profiles:", {
        code: error.code,
        message: error.message,
        details: error.details,
        hint: error.hint,
      });
    }
  }

  if (error || !profile) return null;

  const fullName =
    typeof profile.full_name === "string" && profile.full_name.trim()
      ? profile.full_name.trim()
      : null;

  return {
    user: { id: user.id, email: user.email },
    role: profile.role,
    fullName,
  };
}
