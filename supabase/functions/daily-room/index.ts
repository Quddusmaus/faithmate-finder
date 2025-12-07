import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.85.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface CreateRoomRequest {
  callerUserId: string;
  receiverUserId: string;
  videoEnabled: boolean;
}

serve(async (req) => {
  // Handle CORS preflight requests
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
    const supabase = createClient(supabaseUrl, supabaseAnonKey);
    
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) {
      console.error("Auth error:", authError?.message || "No user found");
      return new Response(
        JSON.stringify({ error: "Invalid or expired token" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log("Authenticated user:", user.id);

    const DAILY_API_KEY = Deno.env.get("DAILY_API_KEY");
    if (!DAILY_API_KEY) {
      console.error("DAILY_API_KEY is not configured");
      return new Response(
        JSON.stringify({ error: "Daily.co API key not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { callerUserId, receiverUserId, videoEnabled }: CreateRoomRequest = await req.json();

    // Verify the authenticated user is the caller
    if (user.id !== callerUserId) {
      console.error("User mismatch: authenticated user is not the caller");
      return new Response(
        JSON.stringify({ error: "Unauthorized: you can only initiate calls for yourself" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Verify users are matched before allowing call creation
    const { data: matchCheck, error: matchError } = await supabase
      .rpc('are_users_matched', { p_user1_id: callerUserId, p_user2_id: receiverUserId });
    
    if (matchError || !matchCheck) {
      console.error("Match check failed:", matchError?.message || "Users not matched");
      return new Response(
        JSON.stringify({ error: "You can only call users you have matched with" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    
    console.log(`Creating Daily.co room for call between ${callerUserId} and ${receiverUserId}`);

    // Create a unique room name based on users
    const roomName = `unity-hearts-${[callerUserId, receiverUserId].sort().join("-").substring(0, 30)}-${Date.now()}`;

    // Create a Daily.co room
    const createRoomResponse = await fetch("https://api.daily.co/v1/rooms", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${DAILY_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        name: roomName,
        privacy: "private",
        properties: {
          // Room expires in 1 hour
          exp: Math.floor(Date.now() / 1000) + 3600,
          // Enable/disable video based on call type
          enable_chat: false,
          enable_knocking: false,
          start_video_off: !videoEnabled,
          start_audio_off: false,
          // Max 2 participants for 1:1 calls
          max_participants: 2,
          // Enable recording if needed later
          enable_recording: "cloud",
          // Better quality settings
          enable_prejoin_ui: false,
          enable_network_ui: true,
          enable_screenshare: false,
        },
      }),
    });

    if (!createRoomResponse.ok) {
      const errorText = await createRoomResponse.text();
      console.error("Daily.co API error:", createRoomResponse.status, errorText);
      return new Response(
        JSON.stringify({ error: "Failed to create room", details: errorText }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const room = await createRoomResponse.json();
    console.log("Room created:", room.name, room.url);

    // Create meeting tokens for both participants
    const createToken = async (userId: string, isOwner: boolean) => {
      const tokenResponse = await fetch("https://api.daily.co/v1/meeting-tokens", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${DAILY_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          properties: {
            room_name: room.name,
            user_id: userId,
            is_owner: isOwner,
            // Token expires when room expires
            exp: Math.floor(Date.now() / 1000) + 3600,
            enable_screenshare: false,
            start_video_off: !videoEnabled,
            start_audio_off: false,
          },
        }),
      });

      if (!tokenResponse.ok) {
        const errorText = await tokenResponse.text();
        console.error("Token creation error:", errorText);
        throw new Error(`Failed to create token: ${errorText}`);
      }

      return tokenResponse.json();
    };

    const [callerToken, receiverToken] = await Promise.all([
      createToken(callerUserId, true),
      createToken(receiverUserId, false),
    ]);

    console.log("Tokens created successfully");

    return new Response(
      JSON.stringify({
        roomUrl: room.url,
        roomName: room.name,
        callerToken: callerToken.token,
        receiverToken: receiverToken.token,
        videoEnabled,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: unknown) {
    console.error("Error in daily-room function:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
