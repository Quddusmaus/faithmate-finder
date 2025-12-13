import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { Resend } from "https://esm.sh/resend@2.0.0";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));
const INTERNAL_WEBHOOK_SECRET = Deno.env.get("INTERNAL_WEBHOOK_SECRET");

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-internal-secret",
};

interface SuspensionEmailRequest {
  user_id: string;
  action_type: "suspend" | "ban";
  reason: string;
  suspended_until?: string;
}

const handler = async (req: Request): Promise<Response> => {
  console.log("send-suspension-email function called");

  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Validate internal webhook secret
    const providedSecret = req.headers.get("x-internal-secret");
    if (!INTERNAL_WEBHOOK_SECRET || providedSecret !== INTERNAL_WEBHOOK_SECRET) {
      console.error("Unauthorized: Invalid or missing internal webhook secret");
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const { user_id, action_type, reason, suspended_until }: SuspensionEmailRequest = await req.json();
    
    console.log(`Processing ${action_type} notification for user: ${user_id}`);

    // Create Supabase client with service role to access user email
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    // Get user email from auth.users
    const { data: userData, error: userError } = await supabaseAdmin.auth.admin.getUserById(user_id);

    if (userError || !userData?.user?.email) {
      console.error("Error fetching user:", userError);
      return new Response(
        JSON.stringify({ error: "User not found or email not available" }),
        { status: 404, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    const userEmail = userData.user.email;
    console.log(`Sending ${action_type} email to: ${userEmail}`);

    // Get user's profile name
    const { data: profileData } = await supabaseAdmin
      .from("profiles")
      .select("name")
      .eq("user_id", user_id)
      .maybeSingle();

    const userName = profileData?.name || "User";

    let subject: string;
    let emailHtml: string;

    if (action_type === "ban") {
      subject = "Important: Your Unity Hearts Account Has Been Suspended";
      emailHtml = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
        </head>
        <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background: linear-gradient(135deg, #dc2626, #b91c1c); padding: 30px; border-radius: 12px 12px 0 0; text-align: center;">
            <h1 style="color: white; margin: 0; font-size: 24px;">Account Permanently Suspended</h1>
          </div>
          <div style="background: #fff; padding: 30px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 12px 12px;">
            <p style="font-size: 16px;">Dear ${userName},</p>
            <p style="font-size: 16px;">We regret to inform you that your Unity Hearts account has been <strong>permanently suspended</strong> due to a violation of our community guidelines.</p>
            
            <div style="background: #fef2f2; border-left: 4px solid #dc2626; padding: 15px; margin: 20px 0; border-radius: 4px;">
              <p style="margin: 0; font-weight: bold; color: #991b1b;">Reason for Suspension:</p>
              <p style="margin: 10px 0 0 0; color: #7f1d1d;">${reason}</p>
            </div>
            
            <p style="font-size: 16px;">This means you will no longer be able to:</p>
            <ul style="font-size: 16px; color: #666;">
              <li>Access your profile</li>
              <li>Connect with other users</li>
              <li>Send or receive messages</li>
            </ul>
            
            <p style="font-size: 16px;">If you believe this action was taken in error, you may contact our support team to appeal this decision.</p>
            
            <p style="font-size: 14px; color: #666; margin-top: 30px;">
              Best regards,<br>
              <strong>The Unity Hearts Team</strong>
            </p>
          </div>
        </body>
        </html>
      `;
    } else {
      const suspendedDate = suspended_until ? new Date(suspended_until).toLocaleDateString('en-US', { 
        weekday: 'long', 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric' 
      }) : "a specified date";

      subject = "Important: Your Unity Hearts Account Has Been Temporarily Suspended";
      emailHtml = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
        </head>
        <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background: linear-gradient(135deg, #f59e0b, #d97706); padding: 30px; border-radius: 12px 12px 0 0; text-align: center;">
            <h1 style="color: white; margin: 0; font-size: 24px;">Account Temporarily Suspended</h1>
          </div>
          <div style="background: #fff; padding: 30px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 12px 12px;">
            <p style="font-size: 16px;">Dear ${userName},</p>
            <p style="font-size: 16px;">Your Unity Hearts account has been <strong>temporarily suspended</strong> due to a violation of our community guidelines.</p>
            
            <div style="background: #fffbeb; border-left: 4px solid #f59e0b; padding: 15px; margin: 20px 0; border-radius: 4px;">
              <p style="margin: 0; font-weight: bold; color: #92400e;">Reason for Suspension:</p>
              <p style="margin: 10px 0 0 0; color: #78350f;">${reason}</p>
            </div>
            
            <div style="background: #f0fdf4; border: 1px solid #bbf7d0; padding: 15px; margin: 20px 0; border-radius: 8px; text-align: center;">
              <p style="margin: 0; font-size: 14px; color: #166534;">Your account will be automatically reactivated on:</p>
              <p style="margin: 10px 0 0 0; font-size: 18px; font-weight: bold; color: #15803d;">${suspendedDate}</p>
            </div>
            
            <p style="font-size: 16px;">During this suspension period, you will not be able to:</p>
            <ul style="font-size: 16px; color: #666;">
              <li>Appear in search results</li>
              <li>Connect with new users</li>
              <li>Send messages</li>
            </ul>
            
            <p style="font-size: 16px;">We encourage you to review our community guidelines to ensure a positive experience for all users when your account is reactivated.</p>
            
            <p style="font-size: 14px; color: #666; margin-top: 30px;">
              Best regards,<br>
              <strong>The Unity Hearts Team</strong>
            </p>
          </div>
        </body>
        </html>
      `;
    }

    const emailResponse = await resend.emails.send({
      from: "Unity Hearts <hello@contact.unityhearts.app>",
      to: [userEmail],
      subject: subject,
      html: emailHtml,
    });

    console.log("Email sent successfully:", emailResponse);

    return new Response(JSON.stringify({ success: true, emailResponse }), {
      status: 200,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  } catch (error: any) {
    console.error("Error in send-suspension-email function:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
};

serve(handler);
