# Carnacristo Stock

Plataforma web (Next.js + Supabase) para vendas com estoque centralizado, conforme PRD e skills em `.cursor/skills/`.

## Pré-requisitos

- Node.js 20+
- Projeto [Supabase](https://supabase.com) (PostgreSQL + Auth + Storage)

## Configuração Supabase

1. Crie um projeto no Supabase.
2. No SQL Editor (ou via CLI), aplique **nesta ordem**:
   - `supabase/migrations/20260113120000_phase1_schema_rls_storage.sql`
   - `supabase/migrations/20260120120000_phase4_cancel_edit_orders.sql` (cancelar/editar pedido + índices)
3. Crie um usuário em **Authentication → Users** (e-mail + senha). O trigger cria `profiles` com papel `vendedor`.
4. Promova o primeiro administrador:

   ```sql
   update public.profiles
   set role = 'admin'
   where email = 'seu@email.com';
   ```

5. Copie variáveis para `.env.local` (veja `.env.local.example`).

## Variáveis de ambiente

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY` (opcional, **necessária** para `POST /api/admin/usuarios` criar vendedores pelo painel)

## Desenvolvimento

```bash
npm install
npm run dev
```

Abra [http://localhost:3000](http://localhost:3000).

## Funcionalidades por fase

### Fases 1–3 (base)

- **Admin**: produtos (upload), PIX estático (`/configuracoes`).
- **Vendedor**: `/novo-pedido` → `/checkout` → `/sucesso`; RPC `create_order_with_inventory`; modal PIX (`<dialog>`) e Realtime em produtos.

### Fase 4 — Admin pedidos e catálogo completo

- **Produtos** (`/produtos`): listagem com `next/image` (prioridade nos primeiros itens), criar, editar (modal), excluir (`DELETE /api/produtos/[id]`).
- **Vendedores** (`/usuarios`): listagem; criação com e-mail/senha via Auth Admin API.
- **Pedidos** (`/pedidos`, `/pedidos/[id]`): filtros por período/status; **cancelar** (`POST .../cancelar` → RPC `cancel_order_with_inventory_refund`); **editar** (RPC `edit_order_with_inventory_adjustment` — estorna itens e reaplica novo carrinho).

### Fase 5 — Relatórios e CSV

- `GET /api/relatorios?from=&to=&sellerId=` — totais, performance por vendedor, breakdown por `payment_method`, checksum de unidades.
- `GET /api/relatorios/export?...` — **exportação CSV on-demand** (mesmos filtros).

### Fase 6 — NFR / PWA / A11y

- Lista de produtos (vendedor): `priority` + `fetchPriority` nos primeiros cards; `sizes` otimizado.
- Modal PIX: elemento nativo `<dialog>`, `showModal`, foco inicial no botão Fechar, ciclo de foco com Tab.
- PWA: `src/app/manifest.ts`, `public/sw.js`, registro do SW em produção (`ServiceWorkerRegister`).
- `viewport` / `themeColor` no layout.

## API (resumo)

| Método | Rota | Descrição |
|--------|------|-----------|
| GET/POST | `/api/produtos` | Lista / criar |
| GET/PATCH/DELETE | `/api/produtos/[id]` | Detalhe / atualizar / excluir (admin) |
| GET/POST | `/api/pedidos` | Lista (admin + query) / criar (vendedor) |
| GET/PATCH | `/api/pedidos/[id]` | Detalhe / editar (admin) |
| POST | `/api/pedidos/[id]/cancelar` | Cancelar (admin) |
| GET | `/api/relatorios` | JSON de relatório |
| GET | `/api/relatorios/export` | CSV |
| GET/POST | `/api/admin/usuarios` | Listar / criar vendedor (POST exige service role) |
| GET/PUT | `/api/configuracoes/qrcode` | Ler / salvar PIX |

## Próximos passos sugeridos

Testes E2E (Playwright/Cypress), rate limiting em APIs sensíveis, ícones PWA em `manifest`, políticas Storage adicionais conforme ambiente.
