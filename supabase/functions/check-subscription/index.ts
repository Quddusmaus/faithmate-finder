// DISABLED: Stripe has been removed. Payments will move to Apple/Google in-app
// purchases later. Until then there is no paywall — every authenticated user has
// full access. This function no longer talks to Stripe; it simply reports the
// caller as subscribed so any legacy caller continues to work without gating.
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  return new Response(
    JSON.stringify({
      subscribed: true,
      tier: "premium",
      subscription_end: null,
      comped: false,
    }),
    {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    },
  );
});
