import { useRef, useState, useCallback, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { RealtimeChannel } from "@supabase/supabase-js";

interface UseWebRTCProps {
  localUserId: string;
  remoteUserId: string;
  onCallEnded?: () => void;
}

const ICE_SERVERS = [
  { urls: "stun:stun.l.google.com:19302" },
  { urls: "stun:stun1.l.google.com:19302" },
  { urls: "stun:stun2.l.google.com:19302" },
  { urls: "stun:stun3.l.google.com:19302" },
  { urls: "stun:stun4.l.google.com:19302" },
  // Free TURN servers from OpenRelay project
  {
    urls: "turn:openrelay.metered.ca:80",
    username: "openrelayproject",
    credential: "openrelayproject",
  },
  {
    urls: "turn:openrelay.metered.ca:443",
    username: "openrelayproject",
    credential: "openrelayproject",
  },
  {
    urls: "turn:openrelay.metered.ca:443?transport=tcp",
    username: "openrelayproject",
    credential: "openrelayproject",
  },
];

export const useWebRTC = ({ localUserId, remoteUserId, onCallEnded }: UseWebRTCProps) => {
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);
  const [isConnecting, setIsConnecting] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOff, setIsVideoOff] = useState(false);

  const peerConnectionRef = useRef<RTCPeerConnection | null>(null);
  const channelRef = useRef<RealtimeChannel | null>(null);
  const pendingCandidatesRef = useRef<RTCIceCandidateInit[]>([]);

  const cleanup = useCallback(() => {
    console.log("Cleaning up WebRTC connection");
    
    if (localStream) {
      localStream.getTracks().forEach(track => track.stop());
    }
    
    if (peerConnectionRef.current) {
      peerConnectionRef.current.close();
      peerConnectionRef.current = null;
    }
    
    if (channelRef.current) {
      supabase.removeChannel(channelRef.current);
      channelRef.current = null;
    }
    
    setLocalStream(null);
    setRemoteStream(null);
    setIsConnecting(false);
    setIsConnected(false);
    pendingCandidatesRef.current = [];
  }, [localStream]);

  const sendSignal = async (signalType: string, signalData: any) => {
    console.log("Sending signal:", signalType);
    await supabase.from("call_signals").insert({
      caller_id: localUserId,
      receiver_id: remoteUserId,
      signal_type: signalType,
      signal_data: signalData,
    });
  };

  const createPeerConnection = useCallback(() => {
    console.log("Creating peer connection");
    const pc = new RTCPeerConnection({ iceServers: ICE_SERVERS });

    pc.onicecandidate = (event) => {
      if (event.candidate) {
        console.log("Sending ICE candidate");
        sendSignal("ice-candidate", { candidate: event.candidate.toJSON() });
      }
    };

    pc.ontrack = (event) => {
      console.log("Received remote track");
      setRemoteStream(event.streams[0]);
    };

    pc.onconnectionstatechange = () => {
      console.log("Connection state:", pc.connectionState);
      if (pc.connectionState === "connected") {
        setIsConnected(true);
        setIsConnecting(false);
      } else if (pc.connectionState === "disconnected" || pc.connectionState === "failed") {
        cleanup();
        onCallEnded?.();
      }
    };

    peerConnectionRef.current = pc;
    return pc;
  }, [localUserId, remoteUserId, cleanup, onCallEnded]);

  const startLocalStream = async (videoEnabled: boolean = true) => {
    try {
      console.log("Starting local stream, video:", videoEnabled);
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: true,
        video: videoEnabled,
      });
      setLocalStream(stream);
      setIsVideoOff(!videoEnabled);
      return stream;
    } catch (error) {
      console.error("Error accessing media devices:", error);
      throw error;
    }
  };

  const initiateCall = async (videoEnabled: boolean = true) => {
    setIsConnecting(true);
    
    try {
      const stream = await startLocalStream(videoEnabled);
      const pc = createPeerConnection();
      
      stream.getTracks().forEach(track => {
        pc.addTrack(track, stream);
      });

      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);
      
      await sendSignal("offer", { 
        sdp: offer.sdp, 
        type: offer.type,
        videoEnabled 
      });
      
      console.log("Call initiated, offer sent");
    } catch (error) {
      console.error("Error initiating call:", error);
      cleanup();
      throw error;
    }
  };

  const acceptCall = async (offerData: any) => {
    setIsConnecting(true);
    
    try {
      const stream = await startLocalStream(offerData.videoEnabled);
      const pc = createPeerConnection();
      
      stream.getTracks().forEach(track => {
        pc.addTrack(track, stream);
      });

      await pc.setRemoteDescription(new RTCSessionDescription({
        sdp: offerData.sdp,
        type: offerData.type,
      }));

      // Add any pending ICE candidates
      for (const candidate of pendingCandidatesRef.current) {
        await pc.addIceCandidate(new RTCIceCandidate(candidate));
      }
      pendingCandidatesRef.current = [];

      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);
      
      await sendSignal("answer", { sdp: answer.sdp, type: answer.type });
      
      console.log("Call accepted, answer sent");
    } catch (error) {
      console.error("Error accepting call:", error);
      cleanup();
      throw error;
    }
  };

  const handleAnswer = async (answerData: any) => {
    console.log("Handling answer");
    const pc = peerConnectionRef.current;
    if (!pc) return;

    await pc.setRemoteDescription(new RTCSessionDescription({
      sdp: answerData.sdp,
      type: answerData.type,
    }));

    // Add any pending ICE candidates
    for (const candidate of pendingCandidatesRef.current) {
      await pc.addIceCandidate(new RTCIceCandidate(candidate));
    }
    pendingCandidatesRef.current = [];
  };

  const handleIceCandidate = async (candidateData: any) => {
    console.log("Handling ICE candidate");
    const pc = peerConnectionRef.current;
    
    if (!pc || !pc.remoteDescription) {
      // Queue the candidate if we don't have remote description yet
      pendingCandidatesRef.current.push(candidateData.candidate);
      return;
    }

    await pc.addIceCandidate(new RTCIceCandidate(candidateData.candidate));
  };

  const endCall = async () => {
    await sendSignal("call-end", {});
    cleanup();
    onCallEnded?.();
  };

  const rejectCall = async () => {
    await sendSignal("call-reject", {});
    cleanup();
    onCallEnded?.();
  };

  const toggleMute = () => {
    if (localStream) {
      localStream.getAudioTracks().forEach(track => {
        track.enabled = !track.enabled;
      });
      setIsMuted(!isMuted);
    }
  };

  const toggleVideo = () => {
    if (localStream) {
      localStream.getVideoTracks().forEach(track => {
        track.enabled = !track.enabled;
      });
      setIsVideoOff(!isVideoOff);
    }
  };

  // Subscribe to signals
  useEffect(() => {
    const channelId = `call:${[localUserId, remoteUserId].sort().join("-")}`;
    
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

          switch (signal.signal_type) {
            case "answer":
              await handleAnswer(signal.signal_data);
              break;
            case "ice-candidate":
              await handleIceCandidate(signal.signal_data);
              break;
            case "call-end":
            case "call-reject":
              cleanup();
              onCallEnded?.();
              break;
          }
        }
      )
      .subscribe();

    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
      }
    };
  }, [localUserId, remoteUserId]);

  return {
    localStream,
    remoteStream,
    isConnecting,
    isConnected,
    isMuted,
    isVideoOff,
    initiateCall,
    acceptCall,
    endCall,
    rejectCall,
    toggleMute,
    toggleVideo,
    cleanup,
  };
};
