---
name: carnacristo-frontend-spec
description: Implementa o frontend do Carnacristo Stock com Next.js App Router, TypeScript, Tailwind, Zustand e TanStack Query, incluindo fluxo de pedidos, modal PIX estatico e experiencia mobile-first. Use ao construir telas, componentes, hooks e stores do frontend.
disable-model-invocation: true
---

# Carnacristo Frontend Spec

## Objetivo

Definir padrao tecnico de frontend para o projeto `Carnacristo Stock`.

## Stack Obrigatorio

- `Next.js 14+` (App Router)
- `React 18+`
- `TypeScript 5+`
- `Tailwind CSS 3.x`
- `Zustand 4.x`
- `TanStack Query 5.x`
- Cliente Supabase para auth, dados, realtime e storage

## Estrutura Minima

Usar esta estrutura base:

- `src/app/(auth)/login/page.tsx`
- `src/app/(admin)/dashboard/page.tsx`
- `src/app/(admin)/produtos/page.tsx`
- `src/app/(admin)/usuarios/page.tsx`
- `src/app/(admin)/configuracoes/page.tsx`
- `src/app/(admin)/relatorios/page.tsx`
- `src/app/(vendedor)/novo-pedido/page.tsx`
- `src/app/(vendedor)/checkout/page.tsx`
- `src/app/(vendedor)/sucesso/page.tsx`
- `src/components/`
- `src/hooks/`
- `src/store/`
- `src/lib/`
- `src/types/`
- `src/utils/`

## Regras de UI e UX

- Interface mobile-first como padrao.
- Fluxo de venda em poucos toques (uso em rua/evento).
- Contraste elevado para ambiente externo.
- Componentes acessiveis com `aria-*`, foco visivel e navegacao por teclado.
- Carregamento de produtos com feedback visual de loading/skeleton.

## Regras do Fluxo de Pedido (Frontend)

1. Vendedor informa titulo do pedido.
2. Seleciona itens e quantidades no catalogo.
3. Front valida estoque em tempo real.
4. Vendedor escolhe forma de pagamento obrigatoria.
5. Ao finalizar:
   - se `pix`: abrir modal tela cheia com QR Code.
   - se outros: seguir confirmacao de sucesso.
6. Criacao do pedido ocorre no backend apos acao final do fluxo.

## Regras de Componentes

### `PaymentMethodSelector`

- Renderiza opcoes:
  - `pix`, `dinheiro`, `credito`, `debito`, `doacao`, `parceria`.
- `pix` deve habilitar fluxo de exibicao de QR Code.
- Campo obrigatorio antes de finalizar pedido.

### `QRCodeModal`

- Modal em tela cheia para `PIX`.
- Busca configuracao ativa de `pix_settings`.
- Exibe imagem QR e descricao configurada pelo ADM.
- Possui estado de loading, erro e fallback.
- Possui botoes `Pago` (chama `onPaid`, conclui pedido) e `Voltar` (chama `onBack`, retorna ao checkout sem POST).
- Escape e `onCancel` do dialog devem acionar `onBack`, nao `onPaid`.

### `ProductCard` e `Cart`

- Mostrar preco formatado em BRL.
- Validar limite por estoque no incremento de quantidade.
- Exibir mensagem de erro: `Estoque insuficiente (Saldo: X)`.

## Estado e Dados no Frontend

- `Zustand`:
  - `cartStore`: itens, quantidades, subtotal, total.
  - `authStore`: sessao, role, dados basicos do usuario.
  - `inventoryStore`: snapshot local de estoque para UX rapida.
- `TanStack Query`:
  - cache de produtos, pedidos, configuracao PIX, relatorios.
  - invalidacao apos criar/cancelar/editar pedido.

## Realtime no Frontend

- Assinar mudancas de `products` via Supabase Realtime.
- Atualizar `inventoryStore` ao receber eventos.
- Evitar sobrescrever alteracoes locais do carrinho sem reconciliacao.

## Performance

- Meta:
  - LCP < 1.5s
  - FCP < 1.0s
  - TTI < 2.5s
- Regras:
  - usar `next/image` para imagens de produto e QR preview quando aplicavel,
  - lazy loading em imagens fora da dobra,
  - code splitting/dynamic import para modais e componentes pesados.

## Seguranca no Frontend

- Nunca expor `SUPABASE_SERVICE_ROLE_KEY` no cliente.
- Proteger rotas por middleware/layout com verificacao de sessao e role.
- Vendedor nao acessa rotas `admin`.
- Tratar erros de autorizacao com redirecionamento para login ou tela 403.

## PWA

- PWA e suficiente para mobilidade v1.
- Priorizar:
  - layout responsivo,
  - instalacao em dispositivo,
  - comportamento estavel em rede movel.

## Convencoes de Codigo

- Componentes reutilizaveis com props tipadas.
- Hooks de dominio por caso de uso (`useProducts`, `useOrder`, `useQRCode`).
- Validacoes em `utils/validation.ts` com mensagens padronizadas.
- Tipos centrais em `src/types/index.ts`.

## Checklist de Entrega Frontend

- [ ] Login e controle de sessao por role.
- [ ] Fluxo completo de novo pedido ate sucesso.
- [ ] Modal PIX funcional com QR Code estatico.
- [ ] Validacao de estoque em tempo real no carrinho.
- [ ] Bloqueio de finalizacao sem forma de pagamento.
- [ ] Atualizacao visual de estoque apos eventos realtime.
- [ ] Telas admin de produtos, usuarios, configuracoes e relatorios.
- [ ] Acessibilidade basica e responsividade mobile-first.
