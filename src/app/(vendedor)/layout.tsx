import { redirect } from "next/navigation";
import { AppHeader, type NavLink } from "@/components/AppHeader";
import { getSessionWithProfile } from "@/lib/auth";

export default async function VendedorLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getSessionWithProfile();
  if (!session) redirect("/login");

  const links: NavLink[] = [
    { href: "/novo-pedido", label: "Novo pedido" },
    { href: "/meus-pedidos", label: "Meus pedidos" },
  ];
  if (session.role === "admin") {
    links.push({ href: "/dashboard", label: "Admin" });
  }

  const displayName = session.fullName ?? session.user.email ?? "Usuário";

  return (
    <div className="min-h-screen">
      <AppHeader
        links={links}
        userDisplayName={displayName}
        userEmail={session.user.email}
        maxWidthClass="max-w-3xl"
      />
      <main className="mx-auto max-w-3xl px-4 py-6">{children}</main>
    </div>
  );
}
