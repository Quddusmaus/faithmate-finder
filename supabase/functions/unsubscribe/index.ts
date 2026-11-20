// One-click unsubscribe from Uniting Hearts notification emails.
//
// The email footer links to https://unityhearts.app/unsubscribe?u=<user id>&t=<token>,
// and that page calls this function. Mail apps (Gmail, Apple Mail) can also call
// it directly via the List-Unsubscribe-Post header, with u and t in the query string.
// The token is an HMAC of the user id signed with INTERNAL_WEBHOOK_SECRET, so a link
// can only unsubscribe the person it was sent to.
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const INTERNAL_WEBHOOK_SECRET = Deno.env.get("INTERNAL_WEBHOOK_SECRET");

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

async function sign(userId: string, secret: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const sig = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(`unsubscribe:${userId}`));
  return Array.from(new Uint8Array(sig)).map((b) => b.toString(16).padStart(2, "0")).join("");
}

function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  if (!INTERNAL_WEBHOOK_SECRET) {
    console.error("INTERNAL_WEBHOOK_SECRET is not configured");
    return json({ error: "Unsubscribe is not available right now" }, 500);
  }

  // u and t come from the query string (mail-app one-click) or a JSON body (our page).
  const url = new URL(req.url);
  let u = url.searchParams.get("u");
  let t = url.searchParams.get("t");
  if (!u || !t) {
    try {
      const body = await req.json();
      u = body?.u ?? u;
      t = body?.t ?? t;
    } catch {
      // Not JSON (e.g. the one-click form body); query params were the only source.
    }
  }

  if (!u || !t || !UUID_RE.test(u)) return json({ error: "Invalid unsubscribe link" }, 400);

  const expected = await sign(u, INTERNAL_WEBHOOK_SECRET);
  if (!timingSafeEqual(expected, t)) return json({ error: "Invalid unsubscribe link" }, 400);

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  const { error } = await supabase
    .from("notification_preferences")
    .upsert(
      { user_id: u, email_messages: false, email_likes: false, email_matches: false },
      { onConflict: "user_id" },
    );

  if (error) {
    console.error("Unsubscribe failed:", error.message);
    return json({ error: "Could not update your email preferences. Please try again." }, 500);
  }

  return json({ success: true });
});
