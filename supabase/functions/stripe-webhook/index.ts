// DISABLED: Stripe has been removed. No Stripe webhooks are expected anymore.
// This stub stays in place so the endpoint resolves instead of 404ing; it does
// not import Stripe, verifies nothing, and simply acknowledges any request.
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
    JSON.stringify({ received: true, disabled: true }),
    {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    },
  );
});
