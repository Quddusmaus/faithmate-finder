import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const PRODUCT_TIERS: Record<string, string> = {
  "prod_TVxRMVOo4ggFGj": "basic",
  "prod_TVxS2qrvpWe0zd": "premium",
};

// Statuses that grant access when current_period_end is in the future.
const ACCESS_STATUSES = ["active", "trialing", "past_due", "canceled"];

const logStep = (step: string, details?: Record<string, unknown>) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : "";
  console.log(`[CHECK-SUBSCRIPTION] ${step}${detailsStr}`);
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseClient = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    { auth: { persistSession: false } }
  );

  try {
    logStep("Function started");

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("No authorization header provided");

    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userError } = await supabaseClient.auth.getUser(token);
    if (userError) throw new Error(`Authentication error: ${userError.message}`);
    const user = userData.user;
    if (!user?.email) throw new Error("User not authenticated or email not available");
    logStep("User authenticated", { userId: user.id });

    // ----------------------------------------------------------------
    // 1. Comped users always get premium.
    // ----------------------------------------------------------------
    const { data: compedUser, error: compError } = await supabaseClient
      .from("comped_users")
      .select("id")
      .eq("user_id", user.id)
      .maybeSingle();

    if (compError) throw new Error(`Comp status error: ${compError.message}`);

    if (compedUser) {
      logStep("Comped user — returning premium");
      return json({ subscribed: true, tier: "premium", subscription_end: null, comped: true });
    }

    // ----------------------------------------------------------------
    // 2. DB-first: check the subscriptions table written by the webhook.
    // ----------------------------------------------------------------
    const now = new Date().toISOString();
    const { data: dbSub, error: dbError } = await supabaseClient
      .from("subscriptions")
      .select("tier, status, current_period_end")
      .eq("user_id", user.id)
      .in("status", ACCESS_STATUSES)
      .gt("current_period_end", now)
      .order("current_period_end", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (dbError) throw new Error(`DB subscription lookup error: ${dbError.message}`);

    if (dbSub) {
      logStep("Subscription found in DB", { tier: dbSub.tier, status: dbSub.status });
      return json({
        subscribed: true,
        tier: dbSub.tier,
        subscription_end: dbSub.current_period_end,
      });
    }

    logStep("No active subscription in DB — falling back to Stripe");

    // ----------------------------------------------------------------
    // 3. Stripe fallback: live lookup, then write result to DB so the
    //    next call hits the cache. This covers the window between a
    //    completed checkout and the webhook arriving, and also lets
    //    check-subscription self-heal if a webhook was ever missed.
    // ----------------------------------------------------------------
    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (!stripeKey) throw new Error("STRIPE_SECRET_KEY is not set");

    const stripe = new Stripe(stripeKey, { apiVersion: "2025-08-27.basil" });

    const customers = await stripe.customers.list({ email: user.email, limit: 1 });

    if (customers.data.length === 0) {
      logStep("No Stripe customer found — unsubscribed");
      return json({ subscribed: false, tier: null, subscription_end: null });
    }

    const customerId = customers.data[0].id;
    logStep("Stripe customer found", { customerId });

    const stripeSubs = await stripe.subscriptions.list({
      customer: customerId,
      status: "active",
      limit: 1,
    });

    if (stripeSubs.data.length === 0) {
      logStep("No active Stripe subscription");
      return json({ subscribed: false, tier: null, subscription_end: null });
    }

    const stripeSub = stripeSubs.data[0];
    const productId = stripeSub.items.data[0].price.product as string;
    const tier = PRODUCT_TIERS[productId] ?? "basic";
    const subscriptionEnd = new Date(stripeSub.current_period_end * 1000).toISOString();

    logStep("Active Stripe subscription found", {
      subscriptionId: stripeSub.id,
      tier,
      subscriptionEnd,
    });

    // Write to DB so subsequent checks are served from cache.
    const { error: upsertError } = await supabaseClient
      .from("subscriptions")
      .upsert(
        {
          user_id: user.id,
          stripe_customer_id: customerId,
          stripe_subscription_id: stripeSub.id,
          tier,
          status: stripeSub.status,
          current_period_end: subscriptionEnd,
          cancel_at_period_end: stripeSub.cancel_at_period_end,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "stripe_subscription_id" }
      );

    if (upsertError) {
      // Non-fatal: log and continue — the caller still gets the right answer.
      logStep("WARNING: Failed to cache subscription in DB", { error: upsertError.message });
    }

    return json({ subscribed: true, tier, subscription_end: subscriptionEnd });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("ERROR", { message: errorMessage });
    return new Response(JSON.stringify({ error: errorMessage }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});

function json(body: Record<string, unknown>) {
  return new Response(JSON.stringify(body), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
    status: 200,
  });
}
