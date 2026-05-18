-- Usuários criados antes do trigger ou sem linha em public.profiles ficam presos no login:
-- a Home permite redirect para /novo-pedido, mas os layouts exigem perfil via getSessionWithProfile().
INSERT INTO public.profiles (id, email, full_name, role)
SELECT
  u.id,
  u.email,
  COALESCE(u.raw_user_meta_data ->> 'full_name', ''),
  'vendedor'::public.user_role
FROM auth.users u
WHERE NOT EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = u.id);
