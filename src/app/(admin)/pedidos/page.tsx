import { PedidosAdminList } from "@/components/admin/PedidosAdminList";

export default function AdminPedidosPage() {
  return (
    <div className="space-y-6">
      <h1 className="text-xl font-semibold text-[#233d4d]">Pedidos</h1>
      <PedidosAdminList />
    </div>
  );
}
