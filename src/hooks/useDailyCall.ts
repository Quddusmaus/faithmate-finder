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
      console.log("[DAILY-CALL] Starting call initiation...");
      console.log("[DAILY-CALL] Caller:", localUserId);
      console.log("[DAILY-CALL] Receiver:", remoteUserId);
      console.log("[DAILY-CALL] Video enabled:", videoEnabled);
      
      // Create room via edge function
      console.log("[DAILY-CALL] Invoking daily-room edge function...");
      const { data, error } = await supabase.functions.invoke("daily-room", {
        body: {
          callerUserId: localUserId,
          receiverUserId: remoteUserId,
          videoEnabled,
        },
      });

      if (error) {
        console.error("[DAILY-CALL] Edge function error:", error);
        throw new Error(error?.message || "Failed to create room");
      }
      
      if (!data) {
        console.error("[DAILY-CALL] No data returned from edge function");
        throw new Error("No data returned from room creation");
      }

      console.log("[DAILY-CALL] Room created successfully:", {
        roomName: data.roomName,
        roomUrl: data.roomUrl,
        hasCallerToken: !!data.callerToken,
        hasReceiverToken: !!data.receiverToken,
      });

      // Send call invitation to receiver via call_signals table
      console.log("[DAILY-CALL] Sending call invitation signal...");
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
        console.error("[DAILY-CALL] Signal insert error:", signalError);
        throw new Error("Failed to send call invitation: " + signalError.message);
      }
      
      console.log("[DAILY-CALL] Call invitation sent successfully");

      // Request media permissions first
      console.log("[DAILY-CALL] Requesting media permissions...");
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: videoEnabled,
          audio: true,
        });
        // Stop the test stream
        stream.getTracks().forEach(track => track.stop());
        console.log("[DAILY-CALL] Media permissions granted");
      } catch (mediaError: any) {
        console.error("[DAILY-CALL] Media permission error:", mediaError);
        throw new Error("Please allow camera/microphone access to make calls");
      }

      // Create and join the call
      console.log("[DAILY-CALL] Creating Daily call object...");
      const callObject = DailyIframe.createCallObject({
        url: data.roomUrl,
        token: data.callerToken,
        videoSource: videoEnabled,
        audioSource: true,
      });

      setupCallObject(callObject);

      console.log("[DAILY-CALL] Joining call...");
      await callObject.join();
      console.log("[DAILY-CALL] Successfully joined call as caller");

    } catch (error: any) {
      console.error("[DAILY-CALL] Error initiating call:", error);
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
      console.log("[DAILY-CALL] Accepting call...");
      console.log("[DAILY-CALL] Room:", invitation.roomName);
      console.log("[DAILY-CALL] URL:", invitation.roomUrl);
      console.log("[DAILY-CALL] Has token:", !!invitation.token);
      console.log("[DAILY-CALL] Video enabled:", invitation.videoEnabled);

      // Request media permissions first
      console.log("[DAILY-CALL] Requesting media permissions for receiver...");
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: invitation.videoEnabled,
          audio: true,
        });
        stream.getTracks().forEach(track => track.stop());
        console.log("[DAILY-CALL] Media permissions granted for receiver");
      } catch (mediaError: any) {
        console.error("[DAILY-CALL] Media permission error for receiver:", mediaError);
        throw new Error("Please allow camera/microphone access to join calls");
      }

      console.log("[DAILY-CALL] Creating Daily call object for receiver...");
      const callObject = DailyIframe.createCallObject({
        url: invitation.roomUrl,
        token: invitation.token,
        videoSource: invitation.videoEnabled,
        audioSource: true,
      });

      setupCallObject(callObject);

      console.log("[DAILY-CALL] Receiver joining call...");
      await callObject.join();
      console.log("[DAILY-CALL] Receiver successfully joined call");

    } catch (error: any) {
      console.error("[DAILY-CALL] Error accepting call:", error);
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
    const channelId = `daily-calls:${localUserId}-${remoteUserId}`;
    console.log("[DAILY-CALL] Setting up realtime subscription:", channelId);
    console.log("[DAILY-CALL] Listening for signals where receiver_id =", localUserId);
    
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
          console.log("[DAILY-CALL] Received realtime signal:", {
            type: signal.signal_type,
            callerId: signal.caller_id,
            receiverId: signal.receiver_id,
            expectedCaller: remoteUserId,
          });

          if (signal.signal_type === "daily-invite" && signal.caller_id === remoteUserId) {
            console.log("[DAILY-CALL] Incoming call invitation received!");
            // Incoming call from the person we're chatting with
            setPendingInvitation({
              ...signal.signal_data,
              callerId: signal.caller_id,
            });
          } else if (signal.signal_type === "call-end" || signal.signal_type === "call-reject") {
            if (signal.caller_id === remoteUserId) {
              console.log("[DAILY-CALL] Call ended/rejected by remote user");
              toast.info(signal.signal_type === "call-reject" ? "Call was declined" : "Call ended");
              cleanup();
              onCallEnded?.();
            }
          }
        }
      )
      .subscribe((status) => {
        console.log("[DAILY-CALL] Subscription status:", status);
      });

    return () => {
      console.log("[DAILY-CALL] Cleaning up subscription");
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
