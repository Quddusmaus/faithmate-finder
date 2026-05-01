
-- Restore EXECUTE on helper functions used inside RLS policies.
-- These are SECURITY DEFINER so they run safely with elevated privileges,
-- but Postgres still requires the calling role to have EXECUTE permission.
GRANT EXECUTE ON FUNCTION public.is_blocked(uuid, uuid)            TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role)   TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.is_comped(uuid)                   TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.are_users_matched(uuid, uuid)     TO anon, authenticated;
