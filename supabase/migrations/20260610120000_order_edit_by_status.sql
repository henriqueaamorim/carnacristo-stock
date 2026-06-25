-- Edição de pedidos por status: pagamento-only (completed) e edição completa (pending).

-- ---------------------------------------------------------------------------
-- update_completed_order_payment — altera somente forma de pagamento
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.update_completed_order_payment(
  p_order_id UUID,
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
BEGIN
  IF v_actor IS NULL THEN
    RAISE EXCEPTION 'not_authenticated' USING ERRCODE = '28000';
  END IF;

  SELECT p.role INTO v_role FROM public.profiles p WHERE p.id = v_actor;
  IF v_role IS DISTINCT FROM 'admin' THEN
    RAISE EXCEPTION 'forbidden' USING ERRCODE = '42501';
  END IF;

  IF p_payment_method IS NULL THEN
    RAISE EXCEPTION 'invalid_payment_method' USING ERRCODE = '23514';
  END IF;

  SELECT o.*
    INTO v_order
  FROM public.orders o
  WHERE o.id = p_order_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'order_not_found' USING ERRCODE = '23503';
  END IF;

  IF v_order.status IS DISTINCT FROM 'completed' THEN
    RAISE EXCEPTION 'order_not_completed' USING ERRCODE = '23514';
  END IF;

  UPDATE public.orders o
  SET
    payment_method = p_payment_method,
    updated_at = now()
  WHERE o.id = p_order_id;

  RETURN jsonb_build_object(
    'ok', true,
    'order_id', p_order_id,
    'payment_method', p_payment_method
  );
END;
$$;

REVOKE ALL ON FUNCTION public.update_completed_order_payment (uuid, public.payment_method) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.update_completed_order_payment (uuid, public.payment_method) TO authenticated;

-- ---------------------------------------------------------------------------
-- edit_pending_order_with_inventory — edita pending; opcionalmente finaliza
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.edit_pending_order_with_inventory(
  p_order_id UUID,
  p_title TEXT,
  p_items JSONB,
  p_payment_method public.payment_method DEFAULT NULL
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
  r RECORD;
  v_total NUMERIC(12, 2) := 0;
  v_product_id UUID;
  v_qty INTEGER;
  v_price NUMERIC(12, 2);
  v_sub NUMERIC(12, 2);
  v_new_title TEXT;
  v_new_status public.order_status;
BEGIN
  IF v_actor IS NULL THEN
    RAISE EXCEPTION 'not_authenticated' USING ERRCODE = '28000';
  END IF;

  SELECT p.role INTO v_role FROM public.profiles p WHERE p.id = v_actor;
  IF v_role IS DISTINCT FROM 'admin' THEN
    RAISE EXCEPTION 'forbidden' USING ERRCODE = '42501';
  END IF;

  IF p_items IS NULL OR jsonb_array_length(p_items) = 0 THEN
    RAISE EXCEPTION 'empty_items' USING ERRCODE = '23514';
  END IF;

  SELECT o.*
    INTO v_order
  FROM public.orders o
  WHERE o.id = p_order_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'order_not_found' USING ERRCODE = '23503';
  END IF;

  IF v_order.status IS DISTINCT FROM 'pending' THEN
    RAISE EXCEPTION 'order_not_pending' USING ERRCODE = '23514';
  END IF;

  v_new_title := NULLIF(btrim(COALESCE(p_title, '')), '');
  IF v_new_title IS NULL THEN
    v_new_title := v_order.title;
  END IF;

  IF length(v_new_title) < 5 THEN
    RAISE EXCEPTION 'invalid_title_min_length' USING ERRCODE = '23514';
  END IF;

  IF p_payment_method IS NULL THEN
    v_new_status := 'pending';
  ELSE
    v_new_status := 'completed';
  END IF;

  FOR r IN
    SELECT oi.*
    FROM public.order_items oi
    WHERE oi.order_id = p_order_id
  LOOP
    UPDATE public.products p
    SET
      stock_quantity = p.stock_quantity + r.quantity,
      updated_at = now()
    WHERE p.id = r.product_id;

    INSERT INTO public.inventory_transactions (
      product_id,
      order_id,
      quantity_change,
      transaction_type
    )
    VALUES (
      r.product_id,
      p_order_id,
      r.quantity,
      'refund'
    );
  END LOOP;

  DELETE FROM public.order_items oi WHERE oi.order_id = p_order_id;

  UPDATE public.orders o
  SET
    title = v_new_title,
    payment_method = p_payment_method,
    total_amount = 0,
    status = v_new_status,
    updated_at = now()
  WHERE o.id = p_order_id;

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
        RAISE EXCEPTION 'Estoque insuficiente para edição do pedido' USING ERRCODE = '23514';
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
      p_order_id,
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
      p_order_id,
      -v_qty,
      'adjustment'
    );
  END LOOP;

  UPDATE public.orders o
  SET total_amount = v_total, updated_at = now()
  WHERE o.id = p_order_id;

  RETURN jsonb_build_object(
    'ok', true,
    'order_id', p_order_id,
    'status', v_new_status,
    'payment_method', p_payment_method,
    'total_amount', v_total
  );
END;
$$;

REVOKE ALL ON FUNCTION public.edit_pending_order_with_inventory (uuid, text, jsonb, public.payment_method) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.edit_pending_order_with_inventory (uuid, text, jsonb, public.payment_method) TO authenticated;

-- ---------------------------------------------------------------------------
-- edit_order_with_inventory_adjustment — deprecada
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.edit_order_with_inventory_adjustment(
  p_order_id UUID,
  p_title TEXT,
  p_payment_method public.payment_method,
  p_items JSONB
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RAISE EXCEPTION 'order_not_editable' USING ERRCODE = '23514';
END;
$$;
