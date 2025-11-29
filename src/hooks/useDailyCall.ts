import { useCallback, useEffect, useRef, useState } from "react";
import DailyIframe, { DailyCall, DailyEventObjectParticipant, DailyParticipant } from "@daily-co/daily-js";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface UseDailyCallProps {
  localUserId: string;
  remoteUserId: string;
  onCallEnded?: () => void;
}

interface CallInvitation {
  roomUrl: string;
  roomName: string;
  token: string;
  videoEnabled: boolean;
  callerId: string;
}

export const useDailyCall = ({ localUserId, remoteUserId, onCallEnded }: UseDailyCallProps) => {
  const [isConnecting, setIsConnecting] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOff, setIsVideoOff] = useState(false);
  const [localVideoTrack, setLocalVideoTrack] = useState<MediaStreamTrack | null>(null);
  const [remoteVideoTrack, setRemoteVideoTrack] = useState<MediaStreamTrack | null>(null);
  const [localAudioTrack, setLocalAudioTrack] = useState<MediaStreamTrack | null>(null);
  const [remoteAudioTrack, setRemoteAudioTrack] = useState<MediaStreamTrack | null>(null);
  const [pendingInvitation, setPendingInvitation] = useState<CallInvitation | null>(null);

  const callObjectRef = useRef<DailyCall | null>(null);
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);

  const cleanup = useCallback(() => {
    console.log("Cleaning up Daily call");
    
    if (callObjectRef.current) {
      callObjectRef.current.leave();
      callObjectRef.current.destroy();
      callObjectRef.current = null;
    }

    setLocalVideoTrack(null);
    setRemoteVideoTrack(null);
    setLocalAudioTrack(null);
    setRemoteAudioTrack(null);
    setIsConnecting(false);
    setIsConnected(false);
    setIsMuted(false);
    setIsVideoOff(false);
    setPendingInvitation(null);
  }, []);

  const updateParticipantTracks = useCallback((participant: DailyParticipant, isLocal: boolean) => {
    const videoTrack = participant.tracks?.video?.persistentTrack;
    const audioTrack = participant.tracks?.audio?.persistentTrack;

    if (isLocal) {
      setLocalVideoTrack(videoTrack || null);
      setLocalAudioTrack(audioTrack || null);
    } else {
      setRemoteVideoTrack(videoTrack || null);
      setRemoteAudioTrack(audioTrack || null);
    }
  }, []);

  const setupCallObject = useCallback((callObject: DailyCall) => {
    callObject.on("joined-meeting", (event) => {
      console.log("Joined meeting:", event);
      setIsConnecting(false);
      setIsConnected(true);

      const localParticipant = callObject.participants().local;
      if (localParticipant) {
        updateParticipantTracks(localParticipant, true);
      }
    });

    callObject.on("participant-joined", (event: DailyEventObjectParticipant | undefined) => {
      console.log("Participant joined:", event?.participant?.user_id);
      if (event?.participant && !event.participant.local) {
        updateParticipantTracks(event.participant, false);
      }
    });

    callObject.on("participant-updated", (event: DailyEventObjectParticipant | undefined) => {
      if (event?.participant) {
        updateParticipantTracks(event.participant, event.participant.local);
      }
    });

    callObject.on("participant-left", (event) => {
      console.log("Participant left:", event?.participant?.user_id);
      if (event?.participant && !event.participant.local) {
        setRemoteVideoTrack(null);
        setRemoteAudioTrack(null);
        // End call when other participant leaves
        toast.info("The other participant has left the call");
        cleanup();
        onCallEnded?.();
      }
    });

    callObject.on("left-meeting", () => {
      console.log("Left meeting");
      cleanup();
      onCallEnded?.();
    });

    callObject.on("error", (event) => {
      console.error("Daily error:", event);
      toast.error("Call error: " + (event?.errorMsg || "Unknown error"));
      cleanup();
      onCallEnded?.();
    });

    callObjectRef.current = callObject;
  }, [cleanup, onCallEnded, updateParticipantTracks]);

  const initiateCall = async (videoEnabled: boolean = true) => {
    setIsConnecting(true);
    setIsVideoOff(!videoEnabled);

    try {
      console.log("Creating Daily.co room...");
      
      // Create room via edge function
      const { data, error } = await supabase.functions.invoke("daily-room", {
        body: {
          callerUserId: localUserId,
          receiverUserId: remoteUserId,
          videoEnabled,
        },
      });

      if (error || !data) {
        throw new Error(error?.message || "Failed to create room");
      }

      console.log("Room created:", data.roomName);

      // Send call invitation to receiver via call_signals table
      const { error: signalError } = await supabase.from("call_signals").insert({
        caller_id: localUserId,
        receiver_id: remoteUserId,
        signal_type: "daily-invite",
        signal_data: {
          roomUrl: data.roomUrl,
          roomName: data.roomName,
          token: data.receiverToken,
          videoEnabled,
        },
      });

      if (signalError) {
        throw new Error("Failed to send call invitation");
      }

      // Create and join the call
      const callObject = DailyIframe.createCallObject({
        url: data.roomUrl,
        token: data.callerToken,
        videoSource: videoEnabled,
        audioSource: true,
      });

      setupCallObject(callObject);

      await callObject.join();
      console.log("Joined call as caller");

    } catch (error: any) {
      console.error("Error initiating call:", error);
      toast.error("Failed to start call: " + error.message);
      cleanup();
      throw error;
    }
  };

  const acceptCall = async (invitation: CallInvitation) => {
    setIsConnecting(true);
    setIsVideoOff(!invitation.videoEnabled);
    setPendingInvitation(null);

    try {
      console.log("Accepting call, joining room:", invitation.roomName);

      const callObject = DailyIframe.createCallObject({
        url: invitation.roomUrl,
        token: invitation.token,
        videoSource: invitation.videoEnabled,
        audioSource: true,
      });

      setupCallObject(callObject);

      await callObject.join();
      console.log("Joined call as receiver");

    } catch (error: any) {
      console.error("Error accepting call:", error);
      toast.error("Failed to join call: " + error.message);
      cleanup();
      throw error;
    }
  };

  const rejectCall = async () => {
    if (pendingInvitation) {
      // Send rejection signal
      await supabase.from("call_signals").insert({
        caller_id: localUserId,
        receiver_id: pendingInvitation.callerId,
        signal_type: "call-reject",
        signal_data: {},
      });
    }
    setPendingInvitation(null);
    onCallEnded?.();
  };

  const endCall = async () => {
    // Send end signal
    await supabase.from("call_signals").insert({
      caller_id: localUserId,
      receiver_id: remoteUserId,
      signal_type: "call-end",
      signal_data: {},
    });

    cleanup();
    onCallEnded?.();
  };

  const toggleMute = () => {
    if (callObjectRef.current) {
      const newMuted = !isMuted;
      callObjectRef.current.setLocalAudio(!newMuted);
      setIsMuted(newMuted);
    }
  };

  const toggleVideo = () => {
    if (callObjectRef.current) {
      const newVideoOff = !isVideoOff;
      callObjectRef.current.setLocalVideo(!newVideoOff);
      setIsVideoOff(newVideoOff);
    }
  };

  // Listen for incoming calls and call events
  useEffect(() => {
    const channelId = `daily-calls:${localUserId}`;
    
    channelRef.current = supabase
      .channel(channelId)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "call_signals",
          filter: `receiver_id=eq.${localUserId}`,
        },
        async (payload) => {
          const signal = payload.new as any;
          console.log("Received signal:", signal.signal_type);

          if (signal.signal_type === "daily-invite" && signal.caller_id === remoteUserId) {
            // Incoming call from the person we're chatting with
            setPendingInvitation({
              ...signal.signal_data,
              callerId: signal.caller_id,
            });
          } else if (signal.signal_type === "call-end" || signal.signal_type === "call-reject") {
            if (signal.caller_id === remoteUserId) {
              toast.info(signal.signal_type === "call-reject" ? "Call was declined" : "Call ended");
              cleanup();
              onCallEnded?.();
            }
          }
        }
      )
      .subscribe();

    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
      }
      cleanup();
    };
  }, [localUserId, remoteUserId, cleanup, onCallEnded]);

  return {
    isConnecting,
    isConnected,
    isMuted,
    isVideoOff,
    localVideoTrack,
    remoteVideoTrack,
    localAudioTrack,
    remoteAudioTrack,
    pendingInvitation,
    initiateCall,
    acceptCall,
    rejectCall,
    endCall,
    toggleMute,
    toggleVideo,
    cleanup,
  };
};
