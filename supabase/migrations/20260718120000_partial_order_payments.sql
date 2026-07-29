-- Pagamento parcial de pedidos: histórico de pagamentos por pedido, criação com
-- pagamento parcial e complemento de saldo em pedidos pendentes.

-- ---------------------------------------------------------------------------
-- Tabela order_payments
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.order_payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES public.orders (id) ON DELETE CASCADE,
  amount NUMERIC(12, 2) NOT NULL CHECK (amount > 0),
  payment_method public.payment_method NOT NULL,
  created_by UUID NOT NULL REFERENCES public.profiles (id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_order_payments_order_id
  ON public.order_payments (order_id, created_at);

ALTER TABLE public.order_payments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "order_payments_select" ON public.order_payments;
CREATE POLICY "order_payments_select"
  ON public.order_payments FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = (SELECT auth.uid()) AND p.role = 'admin'
    )
    OR EXISTS (
      SELECT 1 FROM public.orders o
      WHERE o.id = order_payments.order_id
        AND o.seller_id = (SELECT auth.uid())
    )
  );

REVOKE INSERT, UPDATE, DELETE ON public.order_payments FROM authenticated;
GRANT SELECT ON public.order_payments TO authenticated;

-- ---------------------------------------------------------------------------
-- create_order_with_inventory — adiciona p_partial_amount (pagamento parcial
-- no momento da criação). Assinatura muda (novo parâmetro), então a função
-- de 3 parâmetros precisa ser removida antes de recriar com 4.
-- ---------------------------------------------------------------------------
DROP FUNCTION IF EXISTS public.create_order_with_inventory(TEXT, public.payment_method, JSONB);

CREATE OR REPLACE FUNCTION public.create_order_with_inventory(
  p_title TEXT,
  p_payment_method public.payment_method,
  p_items JSONB,
  p_partial_amount NUMERIC DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_seller UUID := auth.uid();
  v_role public.user_role;
  v_order_id UUID;
  v_display TEXT;
  v_total NUMERIC(12, 2) := 0;
  v_status public.order_status;
  v_insert_payment_method public.payment_method;
  v_final_payment_method public.payment_method;
  r RECORD;
  v_product_id UUID;
  v_qty INTEGER;
  v_price NUMERIC(12, 2);
  v_sub NUMERIC(12, 2);
  v_try INT := 0;
BEGIN
  IF v_seller IS NULL THEN
    RAISE EXCEPTION 'not_authenticated' USING ERRCODE = '28000';
  END IF;

  SELECT p.role INTO v_role FROM public.profiles p WHERE p.id = v_seller;
  IF v_role IS NULL OR v_role NOT IN ('vendedor', 'admin') THEN
    RAISE EXCEPTION 'forbidden' USING ERRCODE = '42501';
  END IF;

  IF p_title IS NULL OR btrim(p_title) = '' THEN
    RAISE EXCEPTION 'invalid_title' USING ERRCODE = '23514';
  END IF;

  IF length(btrim(p_title)) < 5 THEN
    RAISE EXCEPTION 'invalid_title_min_length' USING ERRCODE = '23514';
  END IF;

  IF p_items IS NULL OR jsonb_array_length(p_items) = 0 THEN
    RAISE EXCEPTION 'empty_items' USING ERRCODE = '23514';
  END IF;

  IF p_partial_amount IS NOT NULL THEN
    IF p_payment_method IS NULL THEN
      RAISE EXCEPTION 'invalid_payment_method' USING ERRCODE = '23514';
    END IF;
    IF p_partial_amount <= 0 THEN
      RAISE EXCEPTION 'invalid_payment_amount' USING ERRCODE = '23514';
    END IF;
    -- Insere sempre como pending/payment_method NULL: só depois de precificar
    -- os itens sabemos se o valor parcial fecha o pedido ou não.
    v_status := 'pending';
    v_insert_payment_method := NULL;
  ELSIF p_payment_method IS NULL THEN
    v_status := 'pending';
    v_insert_payment_method := NULL;
  ELSE
    v_status := 'completed';
    v_insert_payment_method := p_payment_method;
  END IF;

  LOOP
    v_try := v_try + 1;
    IF v_try > 8 THEN
      RAISE EXCEPTION 'order_id_collision' USING ERRCODE = '23505';
    END IF;

    v_display := upper(substring(replace(gen_random_uuid()::text, '-', ''), 1, 8));

    BEGIN
      INSERT INTO public.orders (
        order_id_display,
        title,
        seller_id,
        payment_method,
        total_amount,
        status
      )
      VALUES (
        v_display,
        btrim(p_title),
        v_seller,
        v_insert_payment_method,
        0,
        v_status
      )
      RETURNING id INTO v_order_id;
      EXIT;
    EXCEPTION
      WHEN unique_violation THEN
        NULL;
    END;
  END LOOP;

  FOR r IN SELECT value AS item FROM jsonb_array_elements(p_items)
  LOOP
    v_product_id := (r.item ->> 'productId')::uuid;
    v_qty := (r.item ->> 'quantity')::integer;

    IF v_qty IS NULL OR v_qty <= 0 THEN
      RAISE EXCEPTION 'invalid_quantity' USING ERRCODE = '23514';
    END IF;

    UPDATE public.products p
    SET
      stock_quantity = p.stock_quantity - v_qty,
      updated_at = now()
    WHERE p.id = v_product_id
      AND p.stock_quantity >= v_qty
    RETURNING p.price INTO v_price;

    IF NOT FOUND THEN
      IF EXISTS (SELECT 1 FROM public.products x WHERE x.id = v_product_id) THEN
        RAISE EXCEPTION 'Estoque insuficiente (Saldo indisponível para o produto)' USING ERRCODE = '23514';
      ELSE
        RAISE EXCEPTION 'product_not_found' USING ERRCODE = '23503';
      END IF;
    END IF;

    v_sub := v_price * v_qty;
    v_total := v_total + v_sub;

    INSERT INTO public.order_items (
      order_id,
      product_id,
      quantity,
      unit_price,
      subtotal
    )
    VALUES (
      v_order_id,
      v_product_id,
      v_qty,
      v_price,
      v_sub
    );

    INSERT INTO public.inventory_transactions (
      product_id,
      order_id,
      quantity_change,
      transaction_type
    )
    VALUES (
      v_product_id,
      v_order_id,
      -v_qty,
      'sale'
    );
  END LOOP;

  IF p_partial_amount IS NOT NULL THEN
    IF p_partial_amount > v_total THEN
      RAISE EXCEPTION 'payment_exceeds_balance' USING ERRCODE = '23514';
    END IF;

    INSERT INTO public.order_payments (order_id, amount, payment_method, created_by)
    VALUES (v_order_id, p_partial_amount, p_payment_method, v_seller);

    IF p_partial_amount = v_total THEN
      v_status := 'completed';
      v_final_payment_method := p_payment_method;
    ELSE
      v_status := 'pending';
      v_final_payment_method := NULL;
    END IF;

    UPDATE public.orders o
    SET total_amount = v_total, status = v_status, payment_method = v_final_payment_method, updated_at = now()
    WHERE o.id = v_order_id;
  ELSE
    UPDATE public.orders o
    SET total_amount = v_total, updated_at = now()
    WHERE o.id = v_order_id;
  END IF;

  RETURN jsonb_build_object(
    'order_id', v_order_id,
    'order_id_display', v_display,
    'total_amount', v_total,
    'status', v_status
  );
END;
$$;

REVOKE ALL ON FUNCTION public.create_order_with_inventory (TEXT, public.payment_method, JSONB, NUMERIC) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.create_order_with_inventory (TEXT, public.payment_method, JSONB, NUMERIC) TO authenticated;

-- ---------------------------------------------------------------------------
-- register_order_payment — complementa o saldo de um pedido pendente.
-- Vendedor dono do pedido ou admin podem chamar.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.register_order_payment(
  p_order_id UUID,
  p_amount NUMERIC,
  p_payment_method public.payment_method
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_actor UUID := auth.uid();
  v_role public.user_role;
  v_order RECORD;
  v_paid NUMERIC(12, 2);
  v_remaining NUMERIC(12, 2);
  v_status public.order_status;
BEGIN
  IF v_actor IS NULL THEN
    RAISE EXCEPTION 'not_authenticated' USING ERRCODE = '28000';
  END IF;

  SELECT p.role INTO v_role FROM public.profiles p WHERE p.id = v_actor;
  IF v_role IS NULL OR v_role NOT IN ('vendedor', 'admin') THEN
    RAISE EXCEPTION 'forbidden' USING ERRCODE = '42501';
  END IF;

  IF p_payment_method IS NULL THEN
    RAISE EXCEPTION 'invalid_payment_method' USING ERRCODE = '23514';
  END IF;

  IF p_amount IS NULL OR p_amount <= 0 THEN
    RAISE EXCEPTION 'invalid_payment_amount' USING ERRCODE = '23514';
  END IF;

  SELECT o.*
    INTO v_order
  FROM public.orders o
  WHERE o.id = p_order_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'order_not_found' USING ERRCODE = '23503';
  END IF;

  IF v_role = 'vendedor' AND v_order.seller_id IS DISTINCT FROM v_actor THEN
    RAISE EXCEPTION 'forbidden' USING ERRCODE = '42501';
  END IF;

  IF v_order.status IS DISTINCT FROM 'pending' THEN
    RAISE EXCEPTION 'order_not_pending' USING ERRCODE = '23514';
  END IF;

  SELECT COALESCE(SUM(amount), 0) INTO v_paid
  FROM public.order_payments
  WHERE order_id = p_order_id;

  v_remaining := v_order.total_amount - v_paid;

  IF p_amount > v_remaining THEN
    RAISE EXCEPTION 'payment_exceeds_balance' USING ERRCODE = '23514';
  END IF;

  INSERT INTO public.order_payments (order_id, amount, payment_method, created_by)
  VALUES (p_order_id, p_amount, p_payment_method, v_actor);

  IF p_amount = v_remaining THEN
    v_status := 'completed';
    UPDATE public.orders o
    SET status = 'completed', payment_method = p_payment_method, updated_at = now()
    WHERE o.id = p_order_id;
  ELSE
    v_status := 'pending';
  END IF;

  RETURN jsonb_build_object(
    'ok', true,
    'order_id', p_order_id,
    'status', v_status,
    'amount_paid', p_amount,
    'total_paid', v_paid + p_amount,
    'remaining_balance', v_remaining - p_amount
  );
END;
$$;

REVOKE ALL ON FUNCTION public.register_order_payment (UUID, NUMERIC, public.payment_method) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.register_order_payment (UUID, NUMERIC, public.payment_method) TO authenticated;
