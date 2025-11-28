import { useRef, useState, useCallback, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { RealtimeChannel } from "@supabase/supabase-js";

interface UseWebRTCProps {
  localUserId: string;
  remoteUserId: string;
  onCallEnded?: () => void;
}

// Multiple TURN server providers for reliability
// Using OpenRelay free TURN servers - no authentication required
const ICE_SERVERS = [
  // Google STUN servers
  { urls: "stun:stun.l.google.com:19302" },
  { urls: "stun:stun1.l.google.com:19302" },
  // OpenRelay free TURN servers (no auth required)
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
  // ExpressTURN free servers
  {
    urls: "turn:relay.webrtc.org:3478",
    username: "user",
    credential: "root",
  },
];

const MAX_RECONNECT_ATTEMPTS = 3;
const RECONNECT_DELAY_MS = 2000;

export const useWebRTC = ({ localUserId, remoteUserId, onCallEnded }: UseWebRTCProps) => {
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);
  const [isConnecting, setIsConnecting] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOff, setIsVideoOff] = useState(false);
  const [isReconnecting, setIsReconnecting] = useState(false);
  const [reconnectAttempt, setReconnectAttempt] = useState(0);

  const peerConnectionRef = useRef<RTCPeerConnection | null>(null);
  const channelRef = useRef<RealtimeChannel | null>(null);
  const pendingCandidatesRef = useRef<RTCIceCandidateInit[]>([]);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastCallConfigRef = useRef<{ videoEnabled: boolean; isInitiator: boolean } | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);

  const clearReconnectTimeout = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }
  }, []);

  const cleanup = useCallback((stopLocalStream: boolean = true) => {
    console.log("Cleaning up WebRTC connection, stopLocalStream:", stopLocalStream);
    
    clearReconnectTimeout();
    
    if (stopLocalStream && localStreamRef.current) {
      localStreamRef.current.getTracks().forEach(track => track.stop());
      localStreamRef.current = null;
      setLocalStream(null);
    }
    
    if (peerConnectionRef.current) {
      peerConnectionRef.current.close();
      peerConnectionRef.current = null;
    }
    
    setRemoteStream(null);
    setIsConnecting(false);
    setIsConnected(false);
    setIsReconnecting(false);
    setReconnectAttempt(0);
    pendingCandidatesRef.current = [];
    lastCallConfigRef.current = null;
  }, [clearReconnectTimeout]);

  const sendSignal = async (signalType: string, signalData: any) => {
    console.log("Sending signal:", signalType);
    await supabase.from("call_signals").insert({
      caller_id: localUserId,
      receiver_id: remoteUserId,
      signal_type: signalType,
      signal_data: signalData,
    });
  };

  // Use ref to avoid circular dependency between attemptReconnect and createPeerConnectionInternal
  const attemptReconnectRef = useRef<() => Promise<void>>();

  const createPeerConnectionInternal = useCallback((forceRelay: boolean = false) => {
    console.log("Creating peer connection, forceRelay:", forceRelay);
    
    const config: RTCConfiguration = {
      iceServers: ICE_SERVERS,
      // Force relay on reconnection attempts to work around NAT issues
      iceTransportPolicy: forceRelay ? "relay" : "all",
      bundlePolicy: "max-bundle",
      rtcpMuxPolicy: "require",
    };
    
    const pc = new RTCPeerConnection(config);

    pc.onicecandidate = (event) => {
      if (event.candidate) {
        const candidateType = event.candidate.candidate.includes("typ relay") 
          ? "relay" 
          : event.candidate.candidate.includes("typ srflx") 
            ? "srflx" 
            : "host";
        console.log(`Sending ICE candidate (${candidateType}):`, event.candidate.candidate.substring(0, 80));
        sendSignal("ice-candidate", { candidate: event.candidate.toJSON() });
      } else {
        console.log("ICE gathering complete");
      }
    };

    pc.onicegatheringstatechange = () => {
      console.log("ICE gathering state:", pc.iceGatheringState);
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
        setIsReconnecting(false);
        setReconnectAttempt(0);
      } else if (pc.connectionState === "disconnected") {
        console.log("Connection disconnected, attempting to reconnect...");
        attemptReconnectRef.current?.();
      } else if (pc.connectionState === "failed") {
        console.log("Connection failed, attempting to reconnect...");
        attemptReconnectRef.current?.();
      }
    };

    pc.oniceconnectionstatechange = () => {
      console.log("ICE connection state:", pc.iceConnectionState);
      if (pc.iceConnectionState === "failed") {
        console.log("ICE connection failed - NAT traversal likely blocked");
      }
      if (pc.iceConnectionState === "disconnected") {
        // Give it a moment to recover before triggering reconnect
        setTimeout(() => {
          if (pc.iceConnectionState === "disconnected") {
            console.log("ICE still disconnected, attempting reconnect");
            attemptReconnectRef.current?.();
          }
        }, 3000);
      }
    };

    peerConnectionRef.current = pc;
    return pc;
  }, [localUserId, remoteUserId]);

  const attemptReconnect = useCallback(async () => {
    if (!lastCallConfigRef.current || reconnectAttempt >= MAX_RECONNECT_ATTEMPTS) {
      console.log("Max reconnection attempts reached or no call config");
      cleanup(true);
      onCallEnded?.();
      return;
    }

    const currentAttempt = reconnectAttempt + 1;
    setReconnectAttempt(currentAttempt);
    setIsReconnecting(true);
    setIsConnected(false);
    
    // Force relay mode on subsequent reconnection attempts
    const forceRelay = currentAttempt > 1;
    console.log(`Reconnection attempt ${currentAttempt}/${MAX_RECONNECT_ATTEMPTS}, forceRelay: ${forceRelay}`);
    
    // Close existing peer connection but keep local stream
    if (peerConnectionRef.current) {
      peerConnectionRef.current.close();
      peerConnectionRef.current = null;
    }
    pendingCandidatesRef.current = [];
    
    // Wait before reconnecting with exponential backoff
    const delay = RECONNECT_DELAY_MS * Math.pow(1.5, currentAttempt - 1);
    
    reconnectTimeoutRef.current = setTimeout(async () => {
      try {
        const { videoEnabled, isInitiator } = lastCallConfigRef.current!;
        
        if (isInitiator) {
          // Re-initiate the call with relay mode if needed
          const pc = createPeerConnectionInternal(forceRelay);
          
          if (localStreamRef.current) {
            localStreamRef.current.getTracks().forEach(track => {
              pc.addTrack(track, localStreamRef.current!);
            });
          }

          const offer = await pc.createOffer();
          await pc.setLocalDescription(offer);
          
          await sendSignal("reconnect-offer", { 
            sdp: offer.sdp, 
            type: offer.type,
            videoEnabled,
            forceRelay,
          });
          
          console.log("Reconnection offer sent with forceRelay:", forceRelay);
        } else {
          // Wait for the initiator to send a reconnect offer
          console.log("Waiting for reconnect offer from initiator");
        }
      } catch (error) {
        console.error("Reconnection attempt failed:", error);
        attemptReconnectRef.current?.();
      }
    }, delay);
  }, [reconnectAttempt, cleanup, onCallEnded, createPeerConnectionInternal]);

  // Keep ref updated with latest attemptReconnect
  useEffect(() => {
    attemptReconnectRef.current = attemptReconnect;
  }, [attemptReconnect]);

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
    lastCallConfigRef.current = { videoEnabled, isInitiator: true };
    
    try {
      const stream = await startLocalStream(videoEnabled);
      localStreamRef.current = stream;
      const pc = createPeerConnectionInternal();
      
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
      cleanup(true);
      throw error;
    }
  };

  const acceptCall = async (offerData: any) => {
    setIsConnecting(true);
    lastCallConfigRef.current = { videoEnabled: offerData.videoEnabled, isInitiator: false };
    
    try {
      const stream = await startLocalStream(offerData.videoEnabled);
      localStreamRef.current = stream;
      const pc = createPeerConnectionInternal();
      
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
      cleanup(true);
      throw error;
    }
  };

  const handleReconnectOffer = async (offerData: any) => {
    console.log("Handling reconnect offer, forceRelay:", offerData.forceRelay);
    setIsReconnecting(true);
    
    try {
      // Close existing peer connection
      if (peerConnectionRef.current) {
        peerConnectionRef.current.close();
      }
      pendingCandidatesRef.current = [];
      
      // Match the relay mode of the initiator
      const pc = createPeerConnectionInternal(offerData.forceRelay || false);
      
      if (localStreamRef.current) {
        localStreamRef.current.getTracks().forEach(track => {
          pc.addTrack(track, localStreamRef.current!);
        });
      }

      await pc.setRemoteDescription(new RTCSessionDescription({
        sdp: offerData.sdp,
        type: offerData.type,
      }));

      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);
      
      await sendSignal("reconnect-answer", { sdp: answer.sdp, type: answer.type });
      
      console.log("Reconnect answer sent");
    } catch (error) {
      console.error("Error handling reconnect offer:", error);
      attemptReconnectRef.current?.();
    }
  };

  const handleReconnectAnswer = async (answerData: any) => {
    console.log("Handling reconnect answer");
    const pc = peerConnectionRef.current;
    if (!pc) return;

    try {
      await pc.setRemoteDescription(new RTCSessionDescription({
        sdp: answerData.sdp,
        type: answerData.type,
      }));

      // Add any pending ICE candidates
      for (const candidate of pendingCandidatesRef.current) {
        await pc.addIceCandidate(new RTCIceCandidate(candidate));
      }
      pendingCandidatesRef.current = [];
    } catch (error) {
      console.error("Error handling reconnect answer:", error);
      attemptReconnectRef.current?.();
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
    cleanup(true);
    onCallEnded?.();
  };

  const rejectCall = async () => {
    await sendSignal("call-reject", {});
    cleanup(true);
    onCallEnded?.();
  };

  const cancelReconnect = () => {
    clearReconnectTimeout();
    cleanup(true);
    onCallEnded?.();
  };

  const toggleMute = () => {
    if (localStreamRef.current) {
      localStreamRef.current.getAudioTracks().forEach(track => {
        track.enabled = !track.enabled;
      });
      setIsMuted(!isMuted);
    }
  };

  const toggleVideo = () => {
    if (localStreamRef.current) {
      localStreamRef.current.getVideoTracks().forEach(track => {
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
            case "reconnect-offer":
              await handleReconnectOffer(signal.signal_data);
              break;
            case "reconnect-answer":
              await handleReconnectAnswer(signal.signal_data);
              break;
            case "call-end":
            case "call-reject":
              cleanup(true);
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
    isReconnecting,
    reconnectAttempt,
    maxReconnectAttempts: MAX_RECONNECT_ATTEMPTS,
    initiateCall,
    acceptCall,
    endCall,
    rejectCall,
    toggleMute,
    toggleVideo,
    cleanup,
    cancelReconnect,
  };
};
