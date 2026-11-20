// Permanently deletes the signed-in member's account (required by Apple and Google).
//
// 1. Checks who is asking from their sign-in token, and that they typed their own email.
// 2. Deletes all their data in one all-or-nothing database call (delete_user_data).
// 3. Removes their photos from storage.
// 4. Deletes their sign-in account, so the email can't log back in.
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  const authHeader = req.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) return json({ error: "Authentication required" }, 401);

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const admin = createClient(supabaseUrl, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, {
    auth: { persistSession: false },
  });

  const { data: { user }, error: authError } = await admin.auth.getUser(authHeader.replace("Bearer ", ""));
  if (authError || !user) return json({ error: "Invalid or expired session. Please sign in again." }, 401);

  let confirmEmail = "";
  try {
    confirmEmail = String((await req.json())?.confirm_email ?? "");
  } catch {
    // Missing body is handled below.
  }
  if (!user.email || confirmEmail.trim().toLowerCase() !== user.email.toLowerCase()) {
    return json({ error: "The email you typed doesn't match your account." }, 400);
  }

  // Step 2: all data, in one transaction.
  const { error: dataError } = await admin.rpc("delete_user_data", { target_user_id: user.id });
  if (dataError) {
    console.error("delete_user_data failed:", dataError.message);
    return json({ error: "We couldn't delete your account. Nothing was removed. Please try again or contact support." }, 500);
  }

  // Step 3: photos. A failure here is logged but doesn't block deletion of the account.
  try {
    const { data: files } = await admin.storage.from("profile-photos").list(user.id, { limit: 1000 });
    if (files && files.length > 0) {
      const { error: removeError } = await admin.storage
        .from("profile-photos")
        .remove(files.map((f) => `${user.id}/${f.name}`));
      if (removeError) console.error("Photo removal failed:", removeError.message);
    }
  } catch (e) {
    console.error("Photo removal threw:", e);
  }

  // Step 4: the sign-in account itself.
  const { error: deleteUserError } = await admin.auth.admin.deleteUser(user.id);
  if (deleteUserError) {
    console.error("auth deleteUser failed:", deleteUserError.message);
    return json({ error: "Your data was deleted, but we couldn't close your sign-in. Please contact support." }, 500);
  }

  return json({ success: true });
});
