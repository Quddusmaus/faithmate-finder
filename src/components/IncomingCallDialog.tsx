import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Phone, PhoneOff, Video } from "lucide-react";
import type { RealtimeChannel } from "@supabase/supabase-js";

interface IncomingCall {
  callerId: string;
  callerName: string;
  callerPhoto?: string;
  offerData: any;
}

interface IncomingCallDialogProps {
  userId: string;
  onAccept: (call: IncomingCall) => void;
  onReject: (callerId: string) => void;
}

export const IncomingCallDialog = ({
  userId,
  onAccept,
  onReject,
}: IncomingCallDialogProps) => {
  const [incomingCall, setIncomingCall] = useState<IncomingCall | null>(null);
  const [channelRef, setChannelRef] = useState<RealtimeChannel | null>(null);

  useEffect(() => {
    const channel = supabase
      .channel(`incoming-calls:${userId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "call_signals",
          filter: `receiver_id=eq.${userId}`,
        },
        async (payload) => {
          const signal = payload.new as any;
          
          if (signal.signal_type === "offer") {
            // Fetch caller profile
            const { data: profile } = await supabase
              .from("profiles")
              .select("name, photo_urls")
              .eq("user_id", signal.caller_id)
              .maybeSingle();

            setIncomingCall({
              callerId: signal.caller_id,
              callerName: profile?.name || "Unknown",
              callerPhoto: profile?.photo_urls?.[0],
              offerData: signal.signal_data,
            });
          } else if (signal.signal_type === "call-end" && incomingCall?.callerId === signal.caller_id) {
            setIncomingCall(null);
          }
        }
      )
      .subscribe();

    setChannelRef(channel);

    return () => {
      if (channel) {
        supabase.removeChannel(channel);
      }
    };
  }, [userId]);

  const handleAccept = () => {
    if (incomingCall) {
      onAccept(incomingCall);
      setIncomingCall(null);
    }
  };

  const handleReject = async () => {
    if (incomingCall) {
      // Send reject signal
      await supabase.from("call_signals").insert({
        caller_id: userId,
        receiver_id: incomingCall.callerId,
        signal_type: "call-reject",
        signal_data: {},
      });
      onReject(incomingCall.callerId);
      setIncomingCall(null);
    }
  };

  if (!incomingCall) return null;

  return (
    <div className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm flex items-center justify-center">
      <div className="bg-card border border-border rounded-2xl p-8 shadow-xl max-w-sm w-full mx-4 animate-in fade-in zoom-in duration-300">
        <div className="text-center">
          <div className="relative mx-auto w-24 h-24 mb-4">
            <Avatar className="w-24 h-24 ring-4 ring-primary/20 animate-pulse">
              <AvatarImage src={incomingCall.callerPhoto} alt={incomingCall.callerName} />
              <AvatarFallback className="text-3xl">{incomingCall.callerName[0]}</AvatarFallback>
            </Avatar>
            <div className="absolute -bottom-1 -right-1 bg-primary rounded-full p-2">
              {incomingCall.offerData.videoEnabled ? (
                <Video className="h-4 w-4 text-primary-foreground" />
              ) : (
                <Phone className="h-4 w-4 text-primary-foreground" />
              )}
            </div>
          </div>

          <h2 className="text-xl font-semibold text-foreground mb-1">
            {incomingCall.callerName}
          </h2>
          <p className="text-muted-foreground mb-6">
            Incoming {incomingCall.offerData.videoEnabled ? "video" : "voice"} call...
          </p>

          <div className="flex items-center justify-center gap-6">
            <Button
              variant="destructive"
              size="icon"
              className="h-14 w-14 rounded-full"
              onClick={handleReject}
            >
              <PhoneOff className="h-6 w-6" />
            </Button>

            <Button
              size="icon"
              className="h-14 w-14 rounded-full bg-green-500 hover:bg-green-600"
              onClick={handleAccept}
            >
              <Phone className="h-6 w-6" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};
