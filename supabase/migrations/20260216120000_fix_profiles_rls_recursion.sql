-- Fix Postgres 42P17 "infinite recursion detected in policy for relation profiles"
-- Cause: profiles_select used EXISTS (SELECT ... FROM profiles ...), which re-entered RLS on profiles.
-- Solution: admin check via SECURITY DEFINER function (owner bypasses RLS on inner SELECT).

CREATE OR REPLACE FUNCTION public.auth_user_is_admin()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = auth.uid() AND p.role = 'admin'
  );
$$;

REVOKE ALL ON FUNCTION public.auth_user_is_admin() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.auth_user_is_admin() TO authenticated;

DROP POLICY IF EXISTS "profiles_select" ON public.profiles;
CREATE POLICY "profiles_select"
  ON public.profiles FOR SELECT TO authenticated
  USING (
    id = (SELECT auth.uid())
    OR public.auth_user_is_admin()
  );
