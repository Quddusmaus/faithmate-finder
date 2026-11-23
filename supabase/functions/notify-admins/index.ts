// Emails every admin when a report, ban appeal or contact message arrives.
// Called only by the database triggers in
// supabase/migrations/20261123000000_admin-alert-emails.sql, which send the
// internal webhook secret; anything else gets 401.
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
import { buildAdminAlert, isAdminAlertKind } from "./content.ts";

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
const INTERNAL_WEBHOOK_SECRET = Deno.env.get("INTERNAL_WEBHOOK_SECRET");

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });
}

serve(async (req: Request): Promise<Response> => {
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  const providedSecret = req.headers.get("x-internal-secret");
  if (!INTERNAL_WEBHOOK_SECRET || providedSecret !== INTERNAL_WEBHOOK_SECRET) {
    return json({ error: "Unauthorized" }, 401);
  }

  try {
    const { kind, detail } = await req.json();
    if (!isAdminAlertKind(kind)) return json({ error: "Unknown kind" }, 400);
    if (!RESEND_API_KEY) throw new Error("RESEND_API_KEY is not set");

    const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const { data: roles, error: rolesError } = await supabase.from("user_roles").select("user_id").eq("role", "admin");
    if (rolesError) throw rolesError;

    const emails: string[] = [];
    for (const { user_id } of roles ?? []) {
      const { data } = await supabase.auth.admin.getUserById(user_id);
      if (data?.user?.email) emails.push(data.user.email);
    }
    if (emails.length === 0) {
      console.warn("notify-admins: no admin emails found");
      return json({ success: true, sent: 0 });
    }

    const { subject, html } = buildAdminAlert(kind, detail);
    let sent = 0;
    // One email per admin, so admins don't see each other's addresses.
    for (const to of emails) {
      const res = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: { Authorization: `Bearer ${RESEND_API_KEY}`, "Content-Type": "application/json" },
        body: JSON.stringify({ from: "Uniting Hearts <hello@contact.unityhearts.app>", to: [to], subject, html }),
      });
      if (res.ok) sent++;
      else console.error("notify-admins: Resend error", res.status, await res.text());
    }
    console.log(`notify-admins: ${kind} alert sent to ${sent} of ${emails.length} admins`);
    return json({ success: sent > 0, sent }, sent > 0 ? 200 : 502);
  } catch (error) {
    console.error("notify-admins error:", error);
    return json({ error: error instanceof Error ? error.message : String(error) }, 500);
  }
});
