-- Carnacristo Stock — Fase 1: schema, RLS, storage
-- Requires: pgcrypto (gen_random_uuid) — enabled by default on Supabase

-- ---------------------------------------------------------------------------
-- Extensions
-- ---------------------------------------------------------------------------
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ---------------------------------------------------------------------------
-- Enums
-- ---------------------------------------------------------------------------
DO $$ BEGIN
  CREATE TYPE public.user_role AS ENUM ('admin', 'vendedor');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE public.order_status AS ENUM ('pending', 'completed', 'cancelled');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE public.payment_method AS ENUM (
    'pix',
    'dinheiro',
    'credito',
    'debito',
    'doacao',
    'parceria'
  );
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE public.inventory_tx_type AS ENUM ('sale', 'refund', 'adjustment', 'return');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- ---------------------------------------------------------------------------
-- Profiles (maps auth.users — no password in public schema)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users (id) ON DELETE CASCADE,
  email TEXT,
  full_name TEXT,
  role public.user_role NOT NULL DEFAULT 'vendedor',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_profiles_updated ON public.profiles;
CREATE TRIGGER trg_profiles_updated
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

-- New auth user → profile (default vendedor; promote first admin via SQL)
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, role)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data ->> 'full_name', ''),
    'vendedor'
  )
  ON CONFLICT (id) DO UPDATE
    SET email = EXCLUDED.email,
        full_name = COALESCE(EXCLUDED.full_name, public.profiles.full_name);
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- ---------------------------------------------------------------------------
-- Products
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  price NUMERIC(12, 2) NOT NULL CHECK (price > 0),
  stock_quantity INTEGER NOT NULL DEFAULT 0 CHECK (stock_quantity >= 0),
  image_path TEXT,
  created_by UUID REFERENCES public.profiles (id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

DROP TRIGGER IF EXISTS trg_products_updated ON public.products;
CREATE TRIGGER trg_products_updated
  BEFORE UPDATE ON public.products
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

-- ---------------------------------------------------------------------------
-- Orders
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id_display TEXT NOT NULL,
  title TEXT NOT NULL,
  seller_id UUID NOT NULL REFERENCES public.profiles (id),
  payment_method public.payment_method NOT NULL,
  total_amount NUMERIC(12, 2) NOT NULL DEFAULT 0 CHECK (total_amount >= 0),
  status public.order_status NOT NULL DEFAULT 'completed',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT orders_order_id_display_unique UNIQUE (order_id_display)
);

DROP TRIGGER IF EXISTS trg_orders_updated ON public.orders;
CREATE TRIGGER trg_orders_updated
  BEFORE UPDATE ON public.orders
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

CREATE INDEX IF NOT EXISTS idx_orders_seller_created
  ON public.orders (seller_id, created_at DESC);

-- ---------------------------------------------------------------------------
-- Order items
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.order_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES public.orders (id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES public.products (id),
  quantity INTEGER NOT NULL CHECK (quantity > 0),
  unit_price NUMERIC(12, 2) NOT NULL,
  subtotal NUMERIC(12, 2) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_order_items_order_id ON public.order_items (order_id);

-- ---------------------------------------------------------------------------
-- Inventory audit
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.inventory_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID NOT NULL REFERENCES public.products (id),
  order_id UUID REFERENCES public.orders (id),
  quantity_change INTEGER NOT NULL,
  transaction_type public.inventory_tx_type NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_inventory_transactions_product_id
  ON public.inventory_transactions (product_id);

-- ---------------------------------------------------------------------------
-- PIX settings (static QR image path in Storage)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.pix_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  qr_code_image_path TEXT NOT NULL,
  description TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  updated_by UUID REFERENCES public.profiles (id),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

DROP TRIGGER IF EXISTS trg_pix_settings_updated ON public.pix_settings;
CREATE TRIGGER trg_pix_settings_updated
  BEFORE UPDATE ON public.pix_settings
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

-- At most one active row
CREATE UNIQUE INDEX IF NOT EXISTS pix_settings_one_active
  ON public.pix_settings ((1))
  WHERE (is_active = true);

-- ---------------------------------------------------------------------------
-- RPC: create order + stock (auth.uid() = seller — never trust body)
-- ---------------------------------------------------------------------------
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

REVOKE ALL ON FUNCTION public.create_order_with_inventory (text, public.payment_method, jsonb) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.create_order_with_inventory (text, public.payment_method, jsonb) TO authenticated;

-- ---------------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------------
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inventory_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pix_settings ENABLE ROW LEVEL SECURITY;

-- Profiles
DROP POLICY IF EXISTS "profiles_select" ON public.profiles;
CREATE POLICY "profiles_select"
  ON public.profiles FOR SELECT TO authenticated
  USING (
    id = (SELECT auth.uid())
    OR EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = (SELECT auth.uid()) AND p.role = 'admin'
    )
  );

DROP POLICY IF EXISTS "profiles_update_self" ON public.profiles;
CREATE POLICY "profiles_update_self"
  ON public.profiles FOR UPDATE TO authenticated
  USING (id = (SELECT auth.uid()))
  WITH CHECK (id = (SELECT auth.uid()));

-- Products: all authenticated read; admin write
DROP POLICY IF EXISTS "products_select_auth" ON public.products;
CREATE POLICY "products_select_auth"
  ON public.products FOR SELECT TO authenticated
  USING (true);

DROP POLICY IF EXISTS "products_admin_insert" ON public.products;
CREATE POLICY "products_admin_insert"
  ON public.products FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = (SELECT auth.uid()) AND p.role = 'admin'
    )
  );

DROP POLICY IF EXISTS "products_admin_update" ON public.products;
CREATE POLICY "products_admin_update"
  ON public.products FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = (SELECT auth.uid()) AND p.role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = (SELECT auth.uid()) AND p.role = 'admin'
    )
  );

DROP POLICY IF EXISTS "products_admin_delete" ON public.products;
CREATE POLICY "products_admin_delete"
  ON public.products FOR DELETE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = (SELECT auth.uid()) AND p.role = 'admin'
    )
  );

-- Orders: read own or admin; no direct insert/update/delete for authenticated (RPC uses SECURITY DEFINER)
DROP POLICY IF EXISTS "orders_select" ON public.orders;
CREATE POLICY "orders_select"
  ON public.orders FOR SELECT TO authenticated
  USING (
    seller_id = (SELECT auth.uid())
    OR EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = (SELECT auth.uid()) AND p.role = 'admin'
    )
  );

-- Order items: read if linked order visible
DROP POLICY IF EXISTS "order_items_select" ON public.order_items;
CREATE POLICY "order_items_select"
  ON public.order_items FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.orders o
      WHERE o.id = order_items.order_id
        AND (
          o.seller_id = (SELECT auth.uid())
          OR EXISTS (
            SELECT 1 FROM public.profiles p
            WHERE p.id = (SELECT auth.uid()) AND p.role = 'admin'
          )
        )
    )
  );

-- Inventory: admin only
DROP POLICY IF EXISTS "inventory_select_admin" ON public.inventory_transactions;
CREATE POLICY "inventory_select_admin"
  ON public.inventory_transactions FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = (SELECT auth.uid()) AND p.role = 'admin'
    )
  );

-- PIX settings: authenticated read active (for QR URL resolution client-side); admin write
DROP POLICY IF EXISTS "pix_settings_select" ON public.pix_settings;
CREATE POLICY "pix_settings_select"
  ON public.pix_settings FOR SELECT TO authenticated
  USING (
    is_active = true
    OR EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = (SELECT auth.uid()) AND p.role = 'admin'
    )
  );

DROP POLICY IF EXISTS "pix_settings_admin_insert" ON public.pix_settings;
CREATE POLICY "pix_settings_admin_insert"
  ON public.pix_settings FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = (SELECT auth.uid()) AND p.role = 'admin'
    )
  );

DROP POLICY IF EXISTS "pix_settings_admin_update" ON public.pix_settings;
CREATE POLICY "pix_settings_admin_update"
  ON public.pix_settings FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = (SELECT auth.uid()) AND p.role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = (SELECT auth.uid()) AND p.role = 'admin'
    )
  );

DROP POLICY IF EXISTS "pix_settings_admin_delete" ON public.pix_settings;
CREATE POLICY "pix_settings_admin_delete"
  ON public.pix_settings FOR DELETE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = (SELECT auth.uid()) AND p.role = 'admin'
    )
  );

-- Tighten table privileges: writes on orders tree only via RPC
REVOKE INSERT, UPDATE, DELETE ON public.orders FROM authenticated;
REVOKE INSERT, UPDATE, DELETE ON public.order_items FROM authenticated;
REVOKE INSERT, UPDATE, DELETE ON public.inventory_transactions FROM authenticated;

GRANT SELECT ON public.orders TO authenticated;
GRANT SELECT ON public.order_items TO authenticated;
GRANT SELECT ON public.inventory_transactions TO authenticated;

GRANT SELECT, UPDATE ON public.profiles TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.products TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.pix_settings TO authenticated;

-- ---------------------------------------------------------------------------
-- Storage buckets + policies
-- ---------------------------------------------------------------------------
INSERT INTO storage.buckets (id, name, public)
VALUES ('products', 'products', false)
ON CONFLICT (id) DO NOTHING;

INSERT INTO storage.buckets (id, name, public)
VALUES ('pix', 'pix', false)
ON CONFLICT (id) DO NOTHING;

-- Helper: is admin
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = auth.uid() AND p.role = 'admin'
  );
$$;

REVOKE ALL ON FUNCTION public.is_admin() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_admin() TO authenticated;

-- products bucket
DROP POLICY IF EXISTS "products_bucket_read_auth" ON storage.objects;
CREATE POLICY "products_bucket_read_auth"
  ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'products');

DROP POLICY IF EXISTS "products_bucket_admin_write" ON storage.objects;
CREATE POLICY "products_bucket_admin_write"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'products' AND public.is_admin());

DROP POLICY IF EXISTS "products_bucket_admin_update" ON storage.objects;
CREATE POLICY "products_bucket_admin_update"
  ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'products' AND public.is_admin())
  WITH CHECK (bucket_id = 'products' AND public.is_admin());

DROP POLICY IF EXISTS "products_bucket_admin_delete" ON storage.objects;
CREATE POLICY "products_bucket_admin_delete"
  ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'products' AND public.is_admin());

-- pix bucket: vendedor reads (for checkout modal), admin writes
DROP POLICY IF EXISTS "pix_bucket_read_auth" ON storage.objects;
CREATE POLICY "pix_bucket_read_auth"
  ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'pix');

DROP POLICY IF EXISTS "pix_bucket_admin_write" ON storage.objects;
CREATE POLICY "pix_bucket_admin_write"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'pix' AND public.is_admin());

DROP POLICY IF EXISTS "pix_bucket_admin_update" ON storage.objects;
CREATE POLICY "pix_bucket_admin_update"
  ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'pix' AND public.is_admin())
  WITH CHECK (bucket_id = 'pix' AND public.is_admin());

DROP POLICY IF EXISTS "pix_bucket_admin_delete" ON storage.objects;
CREATE POLICY "pix_bucket_admin_delete"
  ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'pix' AND public.is_admin());
