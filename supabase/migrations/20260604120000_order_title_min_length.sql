-- Exige título do pedido com pelo menos 5 caracteres (após trim).
CREATE OR REPLACE FUNCTION public.create_order_with_inventory(
  p_title TEXT,
  p_payment_method public.payment_method,
  p_items JSONB
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

  /* order_id_display aleatório: em colisão UNIQUE, tenta de novo (rótulo+GOTO inválido antes de atribuição) */
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
        p_payment_method,
        0,
        'completed'
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

  UPDATE public.orders o
  SET total_amount = v_total, updated_at = now()
  WHERE o.id = v_order_id;

  RETURN jsonb_build_object(
    'order_id', v_order_id,
    'order_id_display', v_display,
    'total_amount', v_total
  );
END;
$$;
