
-- Replace the previous SELECT policy on realtime.messages with one that
-- allows all standard extension types. RLS on the underlying tables
-- (messages, notifications, call_signals, etc.) still gates which rows
-- are actually delivered to each subscriber.
DROP POLICY IF EXISTS "Users can subscribe to their own channels" ON realtime.messages;

CREATE POLICY "Authenticated users can use realtime extensions"
ON realtime.messages
FOR SELECT
TO authenticated
USING (
  extension IN ('postgres_changes', 'presence', 'broadcast')
);
