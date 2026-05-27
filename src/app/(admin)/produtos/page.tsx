import { ProductsAdminPanel } from "@/components/admin/ProductsAdminPanel";

export default function AdminProdutosPage() {
  return (
    <div className="space-y-6">
      <h1 className="text-xl text-base font-black text-black">Produtos</h1>
      <ProductsAdminPanel />
    </div>
  );
}
