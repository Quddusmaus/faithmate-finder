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

  const expiryTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const warningTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearExpiryTimers = useCallback(() => {
    if (expiryTimerRef.current) clearTimeout(expiryTimerRef.current);
    if (warningTimerRef.current) clearTimeout(warningTimerRef.current);
    expiryTimerRef.current = null;
    warningTimerRef.current = null;
  }, []);

  // Warn at 55 min, auto-end at 58 min (room hard-expires at 60 min)
  const startExpiryTimers = useCallback((onEnd: () => void) => {
    clearExpiryTimers();
    warningTimerRef.current = setTimeout(() => {
      toast.warning("Your call will end in 5 minutes (60-minute limit).");
    }, 55 * 60 * 1000);
    expiryTimerRef.current = setTimeout(() => {
      toast.info("Call ended — 60-minute limit reached.");
      onEnd();
    }, 58 * 60 * 1000);
  }, [clearExpiryTimers]);

  const cleanup = useCallback(() => {
    clearExpiryTimers();

    if (callObjectRef.current) {
      try {
        callObjectRef.current.leave();
        callObjectRef.current.destroy();
      } catch {
        // ignore errors during cleanup
      }
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
    callObject.on("joined-meeting", () => {
      setIsConnecting(false);
      setIsConnected(true);

      const localParticipant = callObject.participants().local;
      if (localParticipant) {
        updateParticipantTracks(localParticipant, true);
      }
    });

    callObject.on("participant-joined", (event: DailyEventObjectParticipant | undefined) => {
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
      const { data, error } = await supabase.functions.invoke("daily-room", {
        body: { callerUserId: localUserId, receiverUserId: remoteUserId, videoEnabled },
      });

      if (error) throw new Error(error?.message || "Failed to create room");
      if (!data) throw new Error("No data returned from room creation");

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

      if (signalError) throw new Error("Failed to send call invitation: " + signalError.message);

      if (!navigator.mediaDevices?.getUserMedia) {
        throw new Error("Camera/microphone not supported on this device or browser");
      }
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: videoEnabled, audio: true });
        stream.getTracks().forEach(track => track.stop());
      } catch (mediaError: any) {
        throw new Error("Please allow camera/microphone access to make calls");
      }

      const callObject = DailyIframe.createCallObject({
        url: data.roomUrl,
        token: data.callerToken,
        videoSource: videoEnabled,
        audioSource: true,
      });

      setupCallObject(callObject);

      await Promise.race([
        callObject.join(),
        new Promise((_, reject) =>
          setTimeout(() => reject(new Error("Call join timed out after 30 seconds")), 30000)
        ),
      ]);

      startExpiryTimers(() => { cleanup(); onCallEnded?.(); });

    } catch (error: any) {
      console.error("Failed to start call:", error);
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
      if (!navigator.mediaDevices?.getUserMedia) {
        throw new Error("Camera/microphone not supported on this device or browser");
      }
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: invitation.videoEnabled,
          audio: true,
        });
        stream.getTracks().forEach(track => track.stop());
      } catch (mediaError: any) {
        throw new Error("Please allow camera/microphone access to join calls");
      }

      const callObject = DailyIframe.createCallObject({
        url: invitation.roomUrl,
        token: invitation.token,
        videoSource: invitation.videoEnabled,
        audioSource: true,
      });

      setupCallObject(callObject);

      await Promise.race([
        callObject.join(),
        new Promise((_, reject) =>
          setTimeout(() => reject(new Error("Call join timed out after 30 seconds")), 30000)
        ),
      ]);

      startExpiryTimers(() => { cleanup(); onCallEnded?.(); });

    } catch (error: any) {
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

          if (signal.signal_type === "daily-invite" && signal.caller_id === remoteUserId) {
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
