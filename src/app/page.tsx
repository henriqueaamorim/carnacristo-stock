import { redirect } from "next/navigation";
import { getSessionWithProfile } from "@/lib/auth";

export default async function HomePage() {
  const session = await getSessionWithProfile();
  if (!session) {
    redirect("/login");
  }
  if (session.role === "admin") {
    redirect("/dashboard");
  }
  redirect("/novo-pedido");
}
