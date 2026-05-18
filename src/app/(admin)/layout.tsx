import { redirect } from "next/navigation";
import { AppHeader } from "@/components/AppHeader";
import { getSessionWithProfile } from "@/lib/auth";

const ADMIN_LINKS = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/produtos", label: "Produtos" },
  { href: "/usuarios", label: "Usuários" },
  { href: "/pedidos", label: "Pedidos" },
  { href: "/relatorios", label: "Relatórios" },
  { href: "/configuracoes", label: "PIX" },
  { href: "/novo-pedido", label: "Vendas" },
] as const;

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getSessionWithProfile();
  if (!session) redirect("/login");
  if (session.role !== "admin") redirect("/novo-pedido");

  const displayName = session.fullName ?? session.user.email ?? "Usuário";

  return (
    <div className="min-h-screen">
      <AppHeader
        links={[...ADMIN_LINKS]}
        userDisplayName={displayName}
        userEmail={session.user.email}
        maxWidthClass="max-w-6xl"
      />
      <main className="mx-auto max-w-6xl px-4 py-6">{children}</main>
    </div>
  );
}
