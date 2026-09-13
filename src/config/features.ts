/**
 * Feature flags.
 *
 * PAYWALL_ENABLED gates all subscription enforcement across the app.
 *
 * It is currently OFF because there is no working payment processor — the
 * Stripe application was declined, so no user has any way to pay. With the
 * flag off every signed-in user is treated as having full access: profile
 * browsing is not gated, likes and calls are unlimited, and no upgrade
 * prompts are shown.
 *
 * Nothing was deleted to do this. The Stripe checkout, customer portal,
 * webhook, tier definitions and comp system are all still in place. When a
 * processor is approved, set this to true and the paywall returns exactly as
 * it was.
 */
export const PAYWALL_ENABLED = false;
