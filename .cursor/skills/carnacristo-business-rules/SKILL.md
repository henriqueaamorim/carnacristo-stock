---
name: carnacristo-business-rules
description: Define e aplica regras de negocio da plataforma de vendas e estoque com papeis ADM e Vendedor, controle de estoque em tempo real, fluxo de pedido e pagamento. Use quando criar, revisar ou testar funcionalidades do projeto Carnacristo Stock.
disable-model-invocation: true
---

# Carnacristo Business Rules

## Objetivo

Padronizar as regras de negocio do sistema para evitar divergencias entre produto, implementacao e testes.

## Escopo do Produto

- Plataforma web centralizada para controle de produtos, vendas e estoque.
- Dois perfis de acesso: `ADM` e `Vendedor`.
- Baixa de estoque vinculada a finalizacao de pedido.
- Bloqueio obrigatorio de venda com estoque insuficiente.

## Papeis e Permissoes

### ADM

- Pode acessar modulo administrativo completo.
- Pode fazer CRUD de produtos (nome, descricao, preco, quantidade, imagem).
- Pode criar usuarios vendedores (login e senha).
- Pode configurar QR Code PIX estatico.
- Pode visualizar dashboard e relatorios por periodo e vendedor.
- Pode cancelar ou editar pedidos finalizados.

### Vendedor

- Pode autenticar e acessar modulo de vendas.
- Pode visualizar catalogo de produtos.
- Pode criar pedidos com titulo personalizado.
- Pode selecionar itens, quantidades e forma de pagamento.
- Nao pode acessar rotas de administracao (`/admin`, `/estoque-edit` e equivalentes).

## Regras de Produtos e Estoque

- Produto deve possuir: nome, descricao, preco, quantidade em estoque e imagem.
- Preco deve ser maior que zero.
- Quantidade em estoque deve ser inteira e maior ou igual a zero.
- Produto sem estoque pode ser exibido, mas nao pode ser vendido.
- Na selecao de itens, o sistema deve validar estoque disponivel em tempo real.
- Se `quantidade_pedida > estoque_atual`, bloquear operacao e exibir:
  - `Estoque insuficiente (Saldo: X)`.
- Nao permitir estoque negativo em nenhum cenario.

## Regras de Pedido

- Todo pedido deve ter:
  - identificador unico (ID aleatorio),
  - titulo do pedido (campo textual definido pelo vendedor),
  - ao menos 1 item com quantidade valida,
  - forma de pagamento obrigatoria.
- Metodos de pagamento permitidos:
  - `PIX`
  - `Dinheiro`
  - `Credito`
  - `Debito`
  - `Doacao`
  - `Parceria`
- Finalizacao do pedido:
  - valida disponibilidade final dos itens,
  - registra venda,
  - subtrai estoque de cada item vendido no banco.

## Regras de PIX

- Se forma de pagamento selecionada for `PIX`, apos clicar em `Finalizar Pedido`:
  - abrir modal em tela cheia com QR Code PIX configurado pelo ADM,
  - exibir botoes `Pago` e `Voltar`.
- Ao clicar em `Pago`, concluir a venda (criar pedido, baixar estoque, computar em relatorios).
- Ao clicar em `Voltar` (ou Escape), fechar o modal e retornar ao checkout sem criar pedido nem alterar estoque.

## Regras de Confirmacao de Venda

- Para pagamentos diferentes de PIX, ao finalizar:
  - exibir `Pedido Finalizado com Sucesso`.
- Para PIX:
  - exibir modal primeiro,
  - depois confirmar sucesso somente apos `Pago`.

## Regras de Edicao e Cancelamento de Pedido

- Apenas ADM pode cancelar ou editar pedido finalizado.
- Cancelamento:
  - deve estornar integralmente as quantidades ao estoque.
- Edicao:
  - deve recalcular delta entre estado anterior e novo estado do pedido,
  - aplicar ajuste de estoque correspondente (estorno parcial e/ou nova baixa).
- Toda alteracao em pedido finalizado deve manter consistencia de estoque (nunca negativo).

## Regras de Relatorios e KPI

- Dashboard deve permitir filtro por:
  - periodo,
  - vendedor.
- Exibir no minimo:
  - total de vendas em R$,
  - total de produtos vendidos,
  - performance individual por vendedor.
- Consolidacao financeira deve considerar forma de pagamento dos pedidos finalizados.

## Requisitos Nao-Funcionais Obrigatorios

- Performance:
  - listagem de produtos com LCP menor que 1.5s.
  - usar lazy loading nas imagens de produto.
- Compatibilidade:
  - interface mobile-first,
  - suporte prioritario a Chrome e Safari mobile (iOS/Android).
- Seguranca:
  - autenticacao via JWT,
  - senhas armazenadas com hash BCrypt,
  - protecao de rotas por perfil.
- Acessibilidade:
  - contraste adequado para ambiente externo,
  - suporte a leitores de tela.

## Fluxo Canonico de Venda

1. Vendedor faz login.
2. Cria novo pedido e informa titulo (ex: `Venda Mesa 04`).
3. Seleciona produtos e quantidades.
4. Sistema valida estoque em tempo real.
5. Vendedor seleciona forma de pagamento.
6. Vendedor finaliza pedido.
7. Se pagamento for PIX, mostrar modal com QR Code e aguardar fechamento.
8. Confirmar sucesso da venda.
9. Aplicar baixa no estoque no banco de dados.

## Criticos de Aceite

- Nao existe fluxo que permita estoque negativo.
- Vendedor nunca acessa tela/rota administrativa.
- Pedido sem pagamento nao pode ser finalizado.
- Cancelamento e edicao de pedido por ADM sempre ajustam estoque corretamente.
- Dashboard reflete vendas por periodo, vendedor e pagamento sem divergencia.

## Checklist de Implementacao

Use este checklist ao implementar features:

- [ ] Controle de permissao por papel (`ADM` vs `Vendedor`).
- [ ] Validacao de estoque em tempo real no carrinho.
- [ ] Bloqueio de finalizacao com estoque insuficiente.
- [ ] Baixa de estoque atomica na finalizacao do pedido.
- [ ] Fluxo de pagamento com branch especifico para `PIX`.
- [ ] Estorno/recalculo de estoque em cancelamento e edicao de pedido.
- [ ] Relatorios com filtros por periodo e vendedor.
- [ ] Requisitos de seguranca (JWT + BCrypt + protecao de rota).
- [ ] Requisitos de performance e acessibilidade.

## Fora de Escopo (por enquanto)

- Integracoes fiscais.
- Gateway de pagamento online com conciliacao automatica.
- Multiunidade/multiloja.
