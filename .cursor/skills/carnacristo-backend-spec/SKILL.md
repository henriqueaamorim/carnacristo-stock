---
name: carnacristo-backend-spec
description: Implementa o backend do Carnacristo Stock com Supabase (PostgreSQL, Auth JWT, RLS, Realtime, Storage), incluindo RPC atomica para pedido+estoque, configuracao de PIX estatico e APIs para admin e vendedor. Use ao criar schema SQL, policies, funcoes RPC e rotas de API.
disable-model-invocation: true
---

# Carnacristo Backend Spec

## Objetivo

Definir o padrao tecnico de backend para garantir consistencia, seguranca e integridade de estoque.

## Stack Obrigatorio

- `Supabase`:
  - PostgreSQL
  - Auth JWT
  - Row Level Security (RLS)
  - Realtime
  - Storage
- `Next.js API Routes` para camada de orquestracao/validacao.

## Principios de Backend

- Toda baixa/estorno de estoque deve ser transacional.
- Estoque negativo e proibido em qualquer fluxo.
- Controle de permissao por role em todas as operacoes.
- Auditoria de movimentacao em `inventory_transactions`.
- PIX v1 sem gateway: apenas QR Code estatico + registro de metodo no pedido.

## Modelo de Dados Minimo

Tabelas obrigatorias:

- `users`
- `products`
- `orders`
- `order_items`
- `inventory_transactions`
- `pix_settings`

Campos criticos:

- `orders.order_id_display` unico para exibicao.
- `orders.payment_method` com enum esperado.
- `products.stock_quantity` inteiro >= 0.
- `pix_settings` com apenas uma configuracao ativa por vez.

## PIX v1 (Sem Integracao)

- Nao usar Stripe, Mercado Pago, webhooks ou conciliacao automatica.
- `pix_settings` armazena URL/caminho da imagem no Storage e descricao da chave.
- Fluxo backend:
  1. vendedor seleciona PIX,
  2. frontend exibe QR Code,
  3. ao confirmar fechamento do modal, backend cria pedido e baixa estoque.

## Storage

- Buckets recomendados:
  - `products` para fotos de produto.
  - `pix` para QR Code estatico.
- Upload de QR Code com `upsert` para permitir atualizacao simples.
- Garantir politica de acesso coerente:
  - leitura publica controlada para assets exibidos no front,
  - escrita restrita a `admin`.

## RPC Criticas

### `create_order_with_inventory`

Responsabilidades:

- receber vendedor, titulo, metodo de pagamento e itens.
- validar estoque item a item com lock/checagem segura.
- inserir `orders` e `order_items`.
- debitar `products.stock_quantity`.
- inserir `inventory_transactions` do tipo `sale`.
- atualizar `orders.total_amount`.
- retornar `order_id` e `order_id_display`.
- executar `ROLLBACK` automatico em qualquer falha.

### `cancel_order_with_inventory_refund`

Responsabilidades:

- validar permissao `admin`.
- validar status do pedido.
- devolver quantidades ao estoque.
- registrar transacoes `refund`.
- atualizar status para `cancelled`.

### `edit_order_with_inventory_adjustment`

Responsabilidades:

- validar permissao `admin`.
- recalcular diferenca entre itens antigos e novos.
- aplicar ajustes de estoque (entrada/saida).
- impedir saldo negativo apos ajuste.
- registrar transacoes `adjustment`.

## API Routes Minimas

- `POST /api/pedidos`: cria pedido via RPC atomica.
- `PATCH /api/pedidos/:id`: edicao de pedido (admin).
- `POST /api/pedidos/:id/cancelar`: cancelamento (admin).
- `GET /api/produtos`: listagem de produtos.
- `POST /api/produtos`: CRUD admin com upload de imagem.
- `GET /api/configuracoes/qrcode`: retorna QR Code ativo.
- `PUT /api/configuracoes/qrcode`: atualiza QR Code ativo (admin).
- `GET /api/relatorios`: consolidados por periodo, vendedor e forma de pagamento.

## RLS e Autorizacao

- Ativar RLS em todas as tabelas sensiveis.
- Politicas por role:
  - `admin`: acesso total administrativo.
  - `vendedor`: leitura de produtos e criacao/consulta dos proprios pedidos conforme regra.
- Nunca confiar no `seller_id` enviado pelo cliente sem cruzar com o JWT.

## Seguranca

- JWT obrigatorio em endpoints privados.
- Service role somente no backend seguro.
- Sanitizacao de entrada e validacao de payload.
- Rate limit para rotas de auth e criacao de pedido.
- Mensagens de erro sem vazar detalhes internos.

## Realtime

- Publicar alteracoes de estoque para clientes conectados.
- Dashboard admin e modulo vendedor devem refletir saldo atualizado rapidamente.

## Relatorios

- Permitir filtros por periodo e vendedor.
- Expor:
  - total de vendas em valor,
  - total de itens vendidos,
  - performance por vendedor,
  - consolidado por metodo de pagamento.
- Preparar endpoint para exportacao CSV em tempo real (requisito confirmado).

## Variaveis de Ambiente

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY` (backend only)
- `NEXT_PUBLIC_APP_URL`

## Fora de Escopo v1

- Integracao real com provedores de pagamento.
- Confirmacao automatica de pagamento PIX.
- Fluxos fiscais/contabeis complexos.

## Preparacao para v2

- Manter design extensivel para futura integracao Stripe/Mercado Pago.
- Isolar camada de pagamento para evolucao sem quebrar pedidos/estoque.
- Evitar acoplamento do fluxo de pedido ao provedor de pagamento.

## Checklist de Entrega Backend

- [ ] Schema SQL criado com constraints e indices.
- [ ] RLS habilitado e policies validadas.
- [ ] RPC de criacao de pedido atomica funcionando.
- [ ] RPC de cancelamento e edicao com estorno/ajuste funcionando.
- [ ] Storage de produtos e PIX configurado.
- [ ] Endpoints de configuracao PIX e relatorios implementados.
- [ ] Auditoria de estoque consistente.
- [ ] Exportacao CSV em endpoint de relatorios preparada.
