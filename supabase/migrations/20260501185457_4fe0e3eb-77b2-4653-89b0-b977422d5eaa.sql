CREATE OR REPLACE FUNCTION public.update_internal_webhook_secret(p_secret text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, vault
AS $$
DECLARE
  v_id uuid;
BEGIN
  SELECT id INTO v_id FROM vault.secrets WHERE name = 'internal_webhook_secret';
  IF v_id IS NULL THEN
    PERFORM vault.create_secret(p_secret, 'internal_webhook_secret', 'Internal webhook auth');
  ELSE
    PERFORM vault.update_secret(v_id, p_secret, 'internal_webhook_secret', 'Internal webhook auth');
  END IF;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.update_internal_webhook_secret(text) FROM anon, authenticated, public;