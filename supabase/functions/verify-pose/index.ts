import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.85.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const POSES = [
  { id: "peace", instruction: "Hold up a peace sign (✌️) next to your face", description: "Peace sign near face" },
  { id: "thumbs_up", instruction: "Give a thumbs up (👍) near your chin", description: "Thumbs up near chin" },
  { id: "wave", instruction: "Wave with your open hand (👋) beside your head", description: "Waving hand beside head" },
  { id: "point_up", instruction: "Point one finger up (☝️) above your head", description: "Finger pointing up" },
  { id: "ok_sign", instruction: "Make an OK sign (👌) next to your cheek", description: "OK hand sign near cheek" },
];

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Verify JWT authentication
    const authHeader = req.headers.get("Authorization");
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      console.error("Missing or invalid Authorization header");
      return new Response(
        JSON.stringify({ error: "Authentication required" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const token = authHeader.replace("Bearer ", "");
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const supabaseAuth = createClient(supabaseUrl, supabaseAnonKey);
    
    const { data: { user }, error: authError } = await supabaseAuth.auth.getUser(token);
    if (authError || !user) {
      console.error("Auth error:", authError?.message || "No user found");
      return new Response(
        JSON.stringify({ error: "Invalid or expired token" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log("Authenticated user:", user.id);

    const { action, imageBase64, poseType, verificationId } = await req.json();

    // If verificationId is provided, verify the authenticated user owns it
    if (verificationId) {
      const { data: verification, error: verifyError } = await supabaseAuth
        .from('photo_verifications')
        .select('user_id')
        .eq('id', verificationId)
        .single();
      
      if (verifyError || !verification) {
        console.error("Verification lookup error:", verifyError?.message || "Not found");
        return new Response(
          JSON.stringify({ error: "Verification request not found" }),
          { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      
      if (verification.user_id !== user.id) {
        console.error("Ownership mismatch: user does not own this verification");
        return new Response(
          JSON.stringify({ error: "Unauthorized: you can only verify your own photos" }),
          { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      
      console.log("Ownership verified for verification:", verificationId);
    }
    
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    // Get random pose
    if (action === "get_pose") {
      const randomPose = POSES[Math.floor(Math.random() * POSES.length)];
      console.log("Generated random pose:", randomPose.id);
      return new Response(JSON.stringify({ pose: randomPose }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Verify pose in image
    if (action === "verify") {
      if (!imageBase64 || !poseType) {
        throw new Error("Missing imageBase64 or poseType");
      }

      const pose = POSES.find(p => p.id === poseType);
      if (!pose) {
        throw new Error("Invalid pose type");
      }

      console.log("Verifying pose:", poseType);

      // Use Lovable AI to analyze the image
      const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${LOVABLE_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "google/gemini-2.5-flash",
          messages: [
            {
              role: "user",
              content: [
                {
                  type: "text",
                  text: `You are a photo verification assistant for a dating app. Analyze this selfie image and determine if the person is correctly performing this pose: "${pose.description}".

Requirements:
1. There must be a real human face clearly visible in the image
2. The person must be performing the requested pose: ${pose.instruction}
3. The pose gesture must be clearly visible and match the description
4. The image should look like a genuine selfie (not a photo of a screen or printed image)

Respond with a JSON object (no markdown, just raw JSON):
{
  "isValid": true/false,
  "confidence": 0-100 (how confident you are in your assessment),
  "hasFace": true/false,
  "hasPose": true/false,
  "isGenuine": true/false (not a photo of a photo/screen),
  "reason": "brief explanation of your decision"
}`
                },
                {
                  type: "image_url",
                  image_url: {
                    url: imageBase64.startsWith("data:") ? imageBase64 : `data:image/jpeg;base64,${imageBase64}`
                  }
                }
              ]
            }
          ],
          max_tokens: 500,
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error("AI API error:", response.status, errorText);
        
        if (response.status === 429) {
          return new Response(JSON.stringify({ error: "Rate limit exceeded. Please try again in a moment." }), {
            status: 429,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
        if (response.status === 402) {
          return new Response(JSON.stringify({ error: "AI service unavailable. Please contact support." }), {
            status: 402,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
        throw new Error(`AI API error: ${response.status}`);
      }

      const aiResponse = await response.json();
      const content = aiResponse.choices?.[0]?.message?.content;
      
      console.log("AI response:", content);

      let result;
      try {
        // Clean up the response in case it has markdown code blocks
        const cleanContent = content.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
        result = JSON.parse(cleanContent);
      } catch (parseError) {
        console.error("Failed to parse AI response:", content);
        result = {
          isValid: false,
          confidence: 0,
          hasFace: false,
          hasPose: false,
          isGenuine: false,
          reason: "Unable to analyze the image. Please try again with a clearer photo."
        };
      }

      // Update verification record if verificationId provided
      if (verificationId) {
        const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
        const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
        const supabase = createClient(supabaseUrl, supabaseServiceKey);

        const status = result.isValid && result.confidence >= 70 ? "verified" : "failed";
        
        await supabase
          .from("photo_verifications")
          .update({
            status,
            ai_confidence: result.confidence,
            ai_result: result,
            verified_at: status === "verified" ? new Date().toISOString() : null,
          })
          .eq("id", verificationId);

        // If verified, update the user's profile
        if (status === "verified") {
          // Get the user_id from verification
          const { data: verification } = await supabase
            .from("photo_verifications")
            .select("user_id")
            .eq("id", verificationId)
            .single();

          if (verification) {
            await supabase
              .from("profiles")
              .update({ verified: true })
              .eq("user_id", verification.user_id);
            
            console.log("Profile verified for user:", verification.user_id);
          }
        }
      }

      return new Response(JSON.stringify({ result }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    throw new Error("Invalid action");
  } catch (error) {
    console.error("Error in verify-pose:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
