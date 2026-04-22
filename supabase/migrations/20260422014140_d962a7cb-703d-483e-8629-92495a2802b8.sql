
-- 1. Remove error_logs from realtime publication (sensitive debug data)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
      AND schemaname = 'public'
      AND tablename = 'error_logs'
  ) THEN
    EXECUTE 'ALTER PUBLICATION supabase_realtime DROP TABLE public.error_logs';
  END IF;
END $$;

-- 2. Tighten realtime.messages SELECT policy to scope topics to the authenticated user
DROP POLICY IF EXISTS "Authenticated users can use realtime extensions" ON realtime.messages;
DROP POLICY IF EXISTS "Users can publish to their own channels" ON realtime.messages;
DROP POLICY IF EXISTS "Users can subscribe to their own channels" ON realtime.messages;

-- Allow users to receive broadcasts/presence/postgres_changes only on topics that include their own UID
CREATE POLICY "Users can subscribe to their own channels"
ON realtime.messages
FOR SELECT
TO authenticated
USING (
  (extension = ANY (ARRAY['broadcast'::text, 'presence'::text]))
  AND (topic LIKE '%' || (auth.uid())::text || '%')
  OR extension = 'postgres_changes'::text
);

-- Allow users to publish only to topics that include their own UID
CREATE POLICY "Users can publish to their own channels"
ON realtime.messages
FOR INSERT
TO authenticated
WITH CHECK (
  topic LIKE '%' || (auth.uid())::text || '%'
);
