import { ProductsAdminPanel } from "@/components/admin/ProductsAdminPanel";

export default function AdminProdutosPage() {
  return (
    <div className="space-y-6">
      <h1 className="text-xl font-semibold text-[#233d4d]">Produtos</h1>
      <ProductsAdminPanel />
    </div>
  );
}
