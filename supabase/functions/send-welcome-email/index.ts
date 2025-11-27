import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface WelcomeEmailRequest {
  user_id: string;
  name: string;
}

const handler = async (req: Request): Promise<Response> => {
  console.log("Received welcome email request");
  
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { user_id, name }: WelcomeEmailRequest = await req.json();
    
    console.log(`Processing welcome email for user ${user_id} (${name})`);

    // Create Supabase client to get user email
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get user's email from auth.users
    const { data: userData, error: userError } = await supabase.auth.admin.getUserById(user_id);
    
    if (userError || !userData?.user?.email) {
      console.error("Could not find user email:", userError);
      return new Response(JSON.stringify({ error: "User email not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const recipientEmail = userData.user.email;
    console.log(`Sending welcome email to ${recipientEmail}`);

    const subject = `Welcome to Unity Hearts, ${name}! 💕`;
    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
      </head>
      <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f9fafb; padding: 40px 20px;">
        <div style="max-width: 520px; margin: 0 auto; background: white; border-radius: 16px; padding: 48px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
          <div style="text-align: center; margin-bottom: 32px;">
            <span style="font-size: 56px;">💕</span>
          </div>
          <h1 style="color: #1f2937; font-size: 28px; text-align: center; margin-bottom: 24px;">
            Welcome to Unity Hearts!
          </h1>
          <p style="color: #4b5563; font-size: 16px; line-height: 1.7; text-align: center;">
            Hi <strong>${name}</strong>,
          </p>
          <p style="color: #4b5563; font-size: 16px; line-height: 1.7; text-align: center;">
            We're thrilled to have you join our community of Baháʼí singles seeking meaningful connections built on shared values of unity, equality, and spiritual growth.
          </p>
          
          <div style="background: linear-gradient(135deg, #fdf2f8, #fce7f3); border-radius: 12px; padding: 24px; margin: 32px 0;">
            <h3 style="color: #be185d; font-size: 16px; margin: 0 0 12px 0;">Here's how to get started:</h3>
            <ul style="color: #6b7280; font-size: 14px; line-height: 1.8; margin: 0; padding-left: 20px;">
              <li>Complete your profile with photos and a bio</li>
              <li>Browse profiles of other members</li>
              <li>Like profiles you're interested in</li>
              <li>When you both like each other, it's a match!</li>
              <li>Start a conversation and see where it leads</li>
            </ul>
          </div>
          
          <div style="text-align: center; margin-top: 32px;">
            <a href="https://unity-hearts.lovable.app/profiles" style="display: inline-block; background: linear-gradient(135deg, #ec4899, #f43f5e); color: white; padding: 16px 40px; border-radius: 8px; text-decoration: none; font-weight: 600; font-size: 16px;">
              Start Browsing Profiles
            </a>
          </div>
          
          <p style="color: #6b7280; font-size: 14px; line-height: 1.6; text-align: center; margin-top: 32px;">
            Remember, the best connections are built on authenticity and respect. Take your time, be yourself, and trust in the process.
          </p>
          
          <div style="border-top: 1px solid #e5e7eb; margin-top: 32px; padding-top: 24px;">
            <p style="color: #9ca3af; font-size: 12px; text-align: center; margin: 0;">
              Unity Hearts - Find your perfect match in the Baháʼí community
            </p>
            <p style="color: #9ca3af; font-size: 11px; text-align: center; margin-top: 8px;">
              If you didn't create this account, please ignore this email.
            </p>
          </div>
        </div>
      </body>
      </html>
    `;

    // Send email using Resend REST API
    const emailResponse = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: "Unity Hearts <onboarding@resend.dev>",
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

    console.log("Welcome email sent successfully:", emailResult);

    return new Response(JSON.stringify({ success: true, emailResult }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: any) {
    console.error("Error in send-welcome-email function:", error);
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
