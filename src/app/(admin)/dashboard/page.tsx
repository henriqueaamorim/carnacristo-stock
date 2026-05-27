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
      <h1 className="text-xl text-base font-black text-black">Painel administrativo</h1>
      <p className="max-w-2xl text-base font-medium text-black">
        Gerencie catálogo, vendedores, pedidos e relatórios. O estoque é atualizado em tempo
        real para os vendedores via Supabase Realtime.
      </p>
      <ul className="grid gap-4 sm:grid-cols-2">
        {cards.map(({ href, label, desc, Icon }) => (
          <li key={href}>
            <Link
              href={href}
              className="block overflow-hidden rounded-[1.4rem] border-2 border-black bg-[#eab660] shadow-[6px_6px_0_#233d4d] transition hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-[5px_5px_0_#233d4d]"
            >
              <div className="flex items-center justify-between border-b-2 border-black bg-[#ea5342] px-4 py-3">
                <span className="block text-base font-black text-black">{label}</span>
                <div className="flex items-center gap-2">
                  <span
                    className="h-3 w-3 rounded-full border-2 border-black bg-[#f8dcc0]"
                    aria-hidden="true"
                  />
                  <span
                    className="h-3 w-3 rounded-full border-2 border-black bg-[#f8dcc0]"
                    aria-hidden="true"
                  />
                </div>
              </div>
              <div className="flex items-center justify-between gap-4 p-5">
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-black">{desc}</p>
                </div>
                <div className="rounded-xl border-2 border-black bg-[#fff4e8] p-3 shadow-[3px_3px_0_#000]">
                  <Icon
                    weight="fill"
                    color={ICON_COLOR}
                    size={ICON_SIZE}
                    aria-hidden
                    className="shrink-0"
                  />
                </div>
              </div>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
