-- Create subscriptions table to cache Stripe subscription state
-- All writes come exclusively from the stripe-webhook Edge Function
-- (service role), so no client INSERT/UPDATE/DELETE policies are needed.

CREATE TABLE public.subscriptions (
  id                     UUID        NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id                UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  stripe_customer_id     TEXT        NOT NULL,
  stripe_subscription_id TEXT        NOT NULL,
  tier                   TEXT        NOT NULL CHECK (tier IN ('basic', 'premium')),
  status                 TEXT        NOT NULL,
  current_period_end     TIMESTAMP WITH TIME ZONE,
  cancel_at_period_end   BOOLEAN     NOT NULL DEFAULT false,
  created_at             TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at             TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE (stripe_subscription_id)
);

CREATE INDEX idx_subscriptions_user_id          ON public.subscriptions (user_id);
CREATE INDEX idx_subscriptions_stripe_customer  ON public.subscriptions (stripe_customer_id);

ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own subscription"
ON public.subscriptions FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all subscriptions"
ON public.subscriptions FOR SELECT
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));
