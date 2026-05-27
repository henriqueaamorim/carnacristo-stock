import { UsuariosAdminPanel } from "@/components/admin/UsuariosAdminPanel";

export default function AdminUsuariosPage() {
  return (
    <div className="space-y-6">
      <h1 className="text-xl text-base font-black text-black">Usuários</h1>
      <UsuariosAdminPanel />
    </div>
  );
}
