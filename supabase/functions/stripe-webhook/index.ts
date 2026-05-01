import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const PRODUCT_TIERS: Record<string, string> = {
  "prod_TVxRMVOo4ggFGj": "basic",
  "prod_TVxS2qrvpWe0zd": "premium",
};

const logStep = (step: string, details?: Record<string, unknown>) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : "";
  console.log(`[STRIPE-WEBHOOK] ${step}${detailsStr}`);
};

serve(async (req) => {
  const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
  const webhookSecret = Deno.env.get("STRIPE_WEBHOOK_SECRET");

  if (!stripeKey || !webhookSecret) {
    logStep("ERROR: Missing STRIPE_SECRET_KEY or STRIPE_WEBHOOK_SECRET");
    return new Response("Webhook configuration error", { status: 500 });
  }

  const signature = req.headers.get("stripe-signature");
  if (!signature) {
    logStep("ERROR: Missing stripe-signature header");
    return new Response("Missing stripe-signature header", { status: 400 });
  }

  const stripe = new Stripe(stripeKey, { apiVersion: "2025-08-27.basil" });
  const supabase = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    { auth: { persistSession: false } }
  );

  // Must read raw body before any other consumption for signature verification.
  const body = await req.text();

  let event: Stripe.Event;
  try {
    event = await stripe.webhooks.constructEventAsync(body, signature, webhookSecret);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    logStep("ERROR: Signature verification failed", { error: msg });
    return new Response(`Webhook signature verification failed: ${msg}`, { status: 400 });
  }

  logStep("Event received", { type: event.type, id: event.id });

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        logStep("Processing checkout.session.completed", { sessionId: session.id });

        if (session.mode !== "subscription" || !session.subscription) {
          logStep("Skipping non-subscription session");
          break;
        }

        const userId = session.metadata?.user_id;
        if (!userId) {
          logStep("ERROR: No user_id in session metadata", { sessionId: session.id });
          break;
        }

        const subscription = await stripe.subscriptions.retrieve(
          session.subscription as string
        );

        const productId = resolveProductId(subscription.items.data[0].price.product);
        const tier = PRODUCT_TIERS[productId] ?? "basic";

        await upsertSubscription(supabase, {
          user_id: userId,
          stripe_customer_id: session.customer as string,
          stripe_subscription_id: subscription.id,
          tier,
          status: subscription.status,
          current_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
          cancel_at_period_end: subscription.cancel_at_period_end,
        });

        logStep("Subscription upserted", { userId, tier, subscriptionId: subscription.id });
        break;
      }

      case "customer.subscription.updated": {
        const subscription = event.data.object as Stripe.Subscription;
        logStep("Processing customer.subscription.updated", {
          subscriptionId: subscription.id,
          status: subscription.status,
        });

        // Look up the user_id we stored during checkout.
        const userId = await getUserIdByCustomer(supabase, subscription.customer as string);
        if (!userId) {
          logStep("WARNING: No user found for customer", { customerId: subscription.customer });
          break;
        }

        const productId = resolveProductId(subscription.items.data[0].price.product);
        const tier = PRODUCT_TIERS[productId] ?? "basic";

        await upsertSubscription(supabase, {
          user_id: userId,
          stripe_customer_id: subscription.customer as string,
          stripe_subscription_id: subscription.id,
          tier,
          status: subscription.status,
          current_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
          cancel_at_period_end: subscription.cancel_at_period_end,
        });

        logStep("Subscription updated", {
          userId,
          tier,
          status: subscription.status,
          cancelAtPeriodEnd: subscription.cancel_at_period_end,
        });
        break;
      }

      case "customer.subscription.deleted": {
        const subscription = event.data.object as Stripe.Subscription;
        logStep("Processing customer.subscription.deleted", {
          subscriptionId: subscription.id,
        });

        const { error } = await supabase
          .from("subscriptions")
          .update({ status: "canceled", updated_at: new Date().toISOString() })
          .eq("stripe_subscription_id", subscription.id);

        if (error) throw error;
        logStep("Subscription marked canceled", { subscriptionId: subscription.id });
        break;
      }

      case "invoice.payment_failed": {
        const invoice = event.data.object as Stripe.Invoice;
        logStep("Processing invoice.payment_failed", { invoiceId: invoice.id });

        if (!invoice.subscription) {
          logStep("No subscription on invoice, skipping");
          break;
        }

        const { error } = await supabase
          .from("subscriptions")
          .update({ status: "past_due", updated_at: new Date().toISOString() })
          .eq("stripe_subscription_id", invoice.subscription as string);

        if (error) throw error;
        logStep("Subscription marked past_due", {
          subscriptionId: invoice.subscription,
          customerId: invoice.customer,
        });
        break;
      }

      default:
        logStep("Unhandled event type (ignored)", { type: event.type });
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    logStep("ERROR processing event", { type: event.type, error: msg });
    // Return 500 so Stripe retries the event.
    return new Response(`Error processing webhook: ${msg}`, { status: 500 });
  }

  return new Response(JSON.stringify({ received: true }), {
    headers: { "Content-Type": "application/json" },
    status: 200,
  });
});

// Stripe expands price.product to a full object in some contexts and
// leaves it as a string ID in others. This normalises both cases.
function resolveProductId(product: string | Stripe.Product | Stripe.DeletedProduct): string {
  return typeof product === "string" ? product : product.id;
}

async function upsertSubscription(
  supabase: ReturnType<typeof createClient>,
  data: {
    user_id: string;
    stripe_customer_id: string;
    stripe_subscription_id: string;
    tier: string;
    status: string;
    current_period_end: string;
    cancel_at_period_end: boolean;
  }
) {
  const { error } = await supabase
    .from("subscriptions")
    .upsert({ ...data, updated_at: new Date().toISOString() }, {
      onConflict: "stripe_subscription_id",
    });

  if (error) throw new Error(`upsertSubscription failed: ${error.message}`);
}

async function getUserIdByCustomer(
  supabase: ReturnType<typeof createClient>,
  customerId: string
): Promise<string | null> {
  const { data } = await supabase
    .from("subscriptions")
    .select("user_id")
    .eq("stripe_customer_id", customerId)
    .limit(1)
    .maybeSingle();

  return data?.user_id ?? null;
}
