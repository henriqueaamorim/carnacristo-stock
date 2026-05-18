import { UsuariosAdminPanel } from "@/components/admin/UsuariosAdminPanel";

export default function AdminUsuariosPage() {
  return (
    <div className="space-y-6">
      <h1 className="text-xl font-semibold text-[#233d4d]">Usuários</h1>
      <UsuariosAdminPanel />
    </div>
  );
}
