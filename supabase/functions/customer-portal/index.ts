// DISABLED: Stripe has been removed. There are no subscriptions to manage — every
// authenticated user has full access. Payments will move to Apple/Google in-app
// purchases later. This stub stays in place so the function endpoint resolves
// instead of 404ing; it does not import Stripe and cannot open a billing portal.
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
    JSON.stringify({ error: "Subscription management is disabled. All members have full access." }),
    {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 410,
    },
  );
});
