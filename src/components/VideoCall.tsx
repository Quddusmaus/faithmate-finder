import { useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { 
  PhoneOff, 
  Mic, 
  MicOff, 
  Video, 
  VideoOff,
  Loader2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useWakeLock } from "@/hooks/useWakeLock";

interface VideoCallProps {
  localVideoTrack: MediaStreamTrack | null;
  remoteVideoTrack: MediaStreamTrack | null;
  remoteAudioTrack: MediaStreamTrack | null;
  isConnecting: boolean;
  isConnected: boolean;
  isMuted: boolean;
  isVideoOff: boolean;
  matchName: string;
  matchPhoto?: string;
  onEndCall: () => void;
  onToggleMute: () => void;
  onToggleVideo: () => void;
}

export const VideoCall = ({
  localVideoTrack,
  remoteVideoTrack,
  remoteAudioTrack,
  isConnecting,
  isConnected,
  isMuted,
  isVideoOff,
  matchName,
  matchPhoto,
  onEndCall,
  onToggleMute,
  onToggleVideo,
}: VideoCallProps) => {
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  const remoteAudioRef = useRef<HTMLAudioElement>(null);

  // Keep screen on during calls
  useWakeLock(isConnecting || isConnected);

  // Attach local video track
  useEffect(() => {
    if (localVideoRef.current && localVideoTrack) {
      const stream = new MediaStream([localVideoTrack]);
      localVideoRef.current.srcObject = stream;
    } else if (localVideoRef.current) {
      localVideoRef.current.srcObject = null;
    }
  }, [localVideoTrack]);

  // Attach remote video track
  useEffect(() => {
    if (remoteVideoRef.current && remoteVideoTrack) {
      const stream = new MediaStream([remoteVideoTrack]);
      remoteVideoRef.current.srcObject = stream;
    } else if (remoteVideoRef.current) {
      remoteVideoRef.current.srcObject = null;
    }
  }, [remoteVideoTrack]);

  // Attach remote audio track
  useEffect(() => {
    if (remoteAudioRef.current && remoteAudioTrack) {
      const stream = new MediaStream([remoteAudioTrack]);
      remoteAudioRef.current.srcObject = stream;
    } else if (remoteAudioRef.current) {
      remoteAudioRef.current.srcObject = null;
    }
  }, [remoteAudioTrack]);

  return (
    <div className="fixed inset-0 z-50 bg-background/95 backdrop-blur-sm flex flex-col">
      {/* Hidden audio element for remote audio */}
      <audio ref={remoteAudioRef} autoPlay playsInline />

      {/* Remote video (full screen) */}
      <div className="flex-1 relative bg-muted">
        {remoteVideoTrack ? (
          <video
            ref={remoteVideoRef}
            autoPlay
            playsInline
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <div className="text-center">
              <Avatar className="h-32 w-32 mx-auto mb-4">
                <AvatarImage src={matchPhoto} alt={matchName} />
                <AvatarFallback className="text-4xl">{matchName[0]}</AvatarFallback>
              </Avatar>
              <h2 className="text-2xl font-semibold text-foreground">{matchName}</h2>
              {isConnecting && (
                <div className="flex items-center justify-center gap-2 mt-4 text-muted-foreground">
                  <Loader2 className="h-5 w-5 animate-spin" />
                  <span>Connecting...</span>
                </div>
              )}
              {isConnected && !remoteVideoTrack && (
                <p className="text-muted-foreground mt-2">Voice call in progress</p>
              )}
            </div>
          </div>
        )}

        {/* Local video (picture-in-picture) */}
        <div className="absolute bottom-24 right-4 w-32 h-48 md:w-48 md:h-64 rounded-lg overflow-hidden shadow-lg border-2 border-border">
          {localVideoTrack && !isVideoOff ? (
            <video
              ref={localVideoRef}
              autoPlay
              playsInline
              muted
              className="w-full h-full object-cover mirror"
              style={{ transform: "scaleX(-1)" }}
            />
          ) : (
            <div className="w-full h-full bg-muted flex items-center justify-center">
              <VideoOff className="h-8 w-8 text-muted-foreground" />
            </div>
          )}
        </div>
      </div>

      {/* Controls */}
      <div className="absolute bottom-0 left-0 right-0 p-6 bg-gradient-to-t from-background/90 to-transparent">
        <div className="flex items-center justify-center gap-4">
          <Button
            variant="outline"
            size="icon"
            className={cn(
              "h-14 w-14 rounded-full",
              isMuted && "bg-destructive/20 border-destructive text-destructive"
            )}
            onClick={onToggleMute}
          >
            {isMuted ? <MicOff className="h-6 w-6" /> : <Mic className="h-6 w-6" />}
          </Button>

          <Button
            variant="outline"
            size="icon"
            className={cn(
              "h-14 w-14 rounded-full",
              isVideoOff && "bg-destructive/20 border-destructive text-destructive"
            )}
            onClick={onToggleVideo}
          >
            {isVideoOff ? <VideoOff className="h-6 w-6" /> : <Video className="h-6 w-6" />}
          </Button>

          <Button
            variant="destructive"
            size="icon"
            className="h-14 w-14 rounded-full"
            onClick={onEndCall}
          >
            <PhoneOff className="h-6 w-6" />
          </Button>
        </div>
      </div>
    </div>
  );
};
