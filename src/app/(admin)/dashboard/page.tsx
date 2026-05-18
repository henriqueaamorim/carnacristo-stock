import Link from "next/link";
import type { IconProps } from "@phosphor-icons/react";
import {
  ChartBar,
  ClipboardText,
  Package,
  QrCode,
  ShoppingCartSimple,
  UsersThree,
} from "@phosphor-icons/react/dist/ssr";
import type { ComponentType } from "react";

const ICON_COLOR = "#233d4d";
const ICON_SIZE = 32;

const cards: {
  href: string;
  label: string;
  desc: string;
  Icon: ComponentType<IconProps>;
}[] = [
  { href: "/produtos", label: "Produtos", desc: "CRUD com imagens", Icon: Package },
  {
    href: "/usuarios",
    label: "Usuários",
    desc: "Cadastro e gestão de contas",
    Icon: UsersThree,
  },
  {
    href: "/pedidos",
    label: "Pedidos",
    desc: "Lista, detalhe, cancelar e editar",
    Icon: ClipboardText,
  },
  { href: "/relatorios", label: "Relatórios", desc: "KPIs e export CSV", Icon: ChartBar },
  { href: "/configuracoes", label: "PIX", desc: "QR estático", Icon: QrCode },
  {
    href: "/novo-pedido",
    label: "Modo venda",
    desc: "Ir às vendas",
    Icon: ShoppingCartSimple,
  },
];

export default function AdminDashboardPage() {
  return (
    <div className="space-y-8">
      <h1 className="text-xl font-semibold text-[#233d4d]">Painel administrativo</h1>
      <p className="max-w-2xl text-slate-600">
        Gerencie catálogo, vendedores, pedidos e relatórios. O estoque é atualizado em tempo
        real para os vendedores via Supabase Realtime.
      </p>
      <ul className="grid gap-4 sm:grid-cols-2">
        {cards.map(({ href, label, desc, Icon }) => (
          <li key={href}>
            <Link
              href={href}
              className="flex items-center justify-between gap-4 rounded-xl border border-slate-700 bg-orange-200/50 p-5 shadow-[3px_3px_0px_2px_rgba(35,61,77,1)] transition hover:border-orange-600/50"
            >
              <div className="min-w-0 flex-1">
                <span className="block font-bold text-[#233d4d]">{label}</span>
                <p className="mt-1 text-sm text-[#233d4d]">{desc}</p>
              </div>
              <Icon
                weight="fill"
                color={ICON_COLOR}
                size={ICON_SIZE}
                aria-hidden
                className="shrink-0"
              />
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
