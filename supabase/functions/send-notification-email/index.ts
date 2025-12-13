import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
const INTERNAL_WEBHOOK_SECRET = Deno.env.get("INTERNAL_WEBHOOK_SECRET");

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-internal-secret",
};

interface NotificationEmailRequest {
  type: "like" | "match" | "message";
  recipient_user_id: string;
  sender_name: string;
  sender_user_id: string;
}

const handler = async (req: Request): Promise<Response> => {
  console.log("Received notification email request");
  
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
    const { type, recipient_user_id, sender_name, sender_user_id }: NotificationEmailRequest = await req.json();
    
    console.log(`Processing ${type} notification for user ${recipient_user_id}`);

    // Create Supabase client
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Check user's notification preferences
    const { data: preferences, error: prefError } = await supabase
      .from("notification_preferences")
      .select("*")
      .eq("user_id", recipient_user_id)
      .maybeSingle();

    if (prefError) {
      console.error("Error fetching preferences:", prefError);
    }

    // Check if this notification type is enabled (default to true if no preferences)
    const prefKey = `email_${type}s` as keyof typeof preferences;
    const isEnabled = preferences ? preferences[prefKey] !== false : true;

    if (!isEnabled) {
      console.log(`User has disabled ${type} email notifications, skipping`);
      return new Response(JSON.stringify({ success: true, skipped: true, reason: "disabled" }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get recipient's email from auth.users
    const { data: userData, error: userError } = await supabase.auth.admin.getUserById(recipient_user_id);
    
    if (userError || !userData?.user?.email) {
      console.error("Could not find user email:", userError);
      return new Response(JSON.stringify({ error: "User email not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const recipientEmail = userData.user.email;
    console.log(`Sending ${type} email to ${recipientEmail}`);

    let subject: string;
    let htmlContent: string;

    if (type === "like") {
      subject = `💕 ${sender_name} liked your profile on Unity Hearts!`;
      htmlContent = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
        </head>
        <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f9fafb; padding: 40px 20px;">
          <div style="max-width: 480px; margin: 0 auto; background: white; border-radius: 16px; padding: 40px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
            <div style="text-align: center; margin-bottom: 24px;">
              <span style="font-size: 48px;">💕</span>
            </div>
            <h1 style="color: #1f2937; font-size: 24px; text-align: center; margin-bottom: 16px;">Someone likes you!</h1>
            <p style="color: #4b5563; font-size: 16px; line-height: 1.6; text-align: center;">
              <strong>${sender_name}</strong> just liked your profile on Unity Hearts. 
            </p>
            <p style="color: #6b7280; font-size: 14px; line-height: 1.6; text-align: center; margin-top: 16px;">
              Like them back to start a conversation!
            </p>
            <div style="text-align: center; margin-top: 32px;">
              <a href="https://unityhearts.app/profiles" style="display: inline-block; background: linear-gradient(135deg, #ec4899, #f43f5e); color: white; padding: 14px 32px; border-radius: 8px; text-decoration: none; font-weight: 600;">
                View Profiles
              </a>
            </div>
            <p style="color: #9ca3af; font-size: 12px; text-align: center; margin-top: 32px;">
              Unity Hearts - Find your perfect match in the Baháʼí community
            </p>
            <p style="color: #9ca3af; font-size: 11px; text-align: center; margin-top: 8px;">
              <a href="https://unityhearts.app/profile-setup" style="color: #9ca3af;">Manage email preferences</a>
            </p>
          </div>
        </body>
        </html>
      `;
    } else if (type === "match") {
      subject = `🎉 You have a new match on Unity Hearts!`;
      htmlContent = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
        </head>
        <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f9fafb; padding: 40px 20px;">
          <div style="max-width: 480px; margin: 0 auto; background: white; border-radius: 16px; padding: 40px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
            <div style="text-align: center; margin-bottom: 24px;">
              <span style="font-size: 48px;">🎉</span>
            </div>
            <h1 style="color: #1f2937; font-size: 24px; text-align: center; margin-bottom: 16px;">It's a match!</h1>
            <p style="color: #4b5563; font-size: 16px; line-height: 1.6; text-align: center;">
              You and <strong>${sender_name}</strong> have liked each other!
            </p>
            <p style="color: #6b7280; font-size: 14px; line-height: 1.6; text-align: center; margin-top: 16px;">
              Start a conversation and see where it leads. Good luck! 🍀
            </p>
            <div style="text-align: center; margin-top: 32px;">
              <a href="https://unityhearts.app/messages?match=${sender_user_id}" style="display: inline-block; background: linear-gradient(135deg, #f59e0b, #eab308); color: white; padding: 14px 32px; border-radius: 8px; text-decoration: none; font-weight: 600;">
                Send a Message
              </a>
            </div>
            <p style="color: #9ca3af; font-size: 12px; text-align: center; margin-top: 32px;">
              Unity Hearts - Find your perfect match in the Baháʼí community
            </p>
            <p style="color: #9ca3af; font-size: 11px; text-align: center; margin-top: 8px;">
              <a href="https://unityhearts.app/profile-setup" style="color: #9ca3af;">Manage email preferences</a>
            </p>
          </div>
        </body>
        </html>
      `;
    } else {
      // message type
      subject = `💬 ${sender_name} sent you a message on Unity Hearts!`;
      htmlContent = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
        </head>
        <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f9fafb; padding: 40px 20px;">
          <div style="max-width: 480px; margin: 0 auto; background: white; border-radius: 16px; padding: 40px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
            <div style="text-align: center; margin-bottom: 24px;">
              <span style="font-size: 48px;">💬</span>
            </div>
            <h1 style="color: #1f2937; font-size: 24px; text-align: center; margin-bottom: 16px;">New message!</h1>
            <p style="color: #4b5563; font-size: 16px; line-height: 1.6; text-align: center;">
              <strong>${sender_name}</strong> sent you a message on Unity Hearts.
            </p>
            <p style="color: #6b7280; font-size: 14px; line-height: 1.6; text-align: center; margin-top: 16px;">
              Don't keep them waiting - reply now!
            </p>
            <div style="text-align: center; margin-top: 32px;">
              <a href="https://unityhearts.app/messages?match=${sender_user_id}" style="display: inline-block; background: linear-gradient(135deg, #3b82f6, #6366f1); color: white; padding: 14px 32px; border-radius: 8px; text-decoration: none; font-weight: 600;">
                View Message
              </a>
            </div>
            <p style="color: #9ca3af; font-size: 12px; text-align: center; margin-top: 32px;">
              Unity Hearts - Find your perfect match in the Baháʼí community
            </p>
            <p style="color: #9ca3af; font-size: 11px; text-align: center; margin-top: 8px;">
              <a href="https://unityhearts.app/profile-setup" style="color: #9ca3af;">Manage email preferences</a>
            </p>
          </div>
        </body>
        </html>
      `;
    }

    // Send email using Resend REST API
    const emailResponse = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: "Unity Hearts <hello@contact.unityhearts.app>",
        to: [recipientEmail],
        subject,
        html: htmlContent,
      }),
    });

    const emailResult = await emailResponse.json();
    
    if (!emailResponse.ok) {
      console.error("Resend API error:", emailResult);
      throw new Error(emailResult.message || "Failed to send email");
    }

    console.log("Email sent successfully:", emailResult);

    return new Response(JSON.stringify({ success: true, emailResult }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: any) {
    console.error("Error in send-notification-email function:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
};

serve(handler);
