import { Button } from "@/components/ui/button";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Phone, PhoneOff, Video } from "lucide-react";
import { useRingtone } from "@/hooks/useRingtone";

interface IncomingCallDialogProps {
  callerName: string;
  callerPhoto?: string;
  videoEnabled: boolean;
  onAccept: () => void;
  onReject: () => void;
}

export const IncomingCallDialog = ({
  callerName,
  callerPhoto,
  videoEnabled,
  onAccept,
  onReject,
}: IncomingCallDialogProps) => {
  // Play ringtone while dialog is shown
  useRingtone(true);

  return (
    <div className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm flex items-center justify-center">
      <div className="bg-card border border-border rounded-2xl p-8 shadow-xl max-w-sm w-full mx-4 animate-in fade-in zoom-in duration-300">
        <div className="text-center">
          <div className="relative mx-auto w-24 h-24 mb-4">
            <Avatar className="w-24 h-24 ring-4 ring-primary/20 animate-pulse">
              <AvatarImage src={callerPhoto} alt={callerName} />
              <AvatarFallback className="text-3xl">{callerName?.[0] ?? "?"}</AvatarFallback>
            </Avatar>
            <div className="absolute -bottom-1 -right-1 bg-primary rounded-full p-2">
              {videoEnabled ? (
                <Video className="h-4 w-4 text-primary-foreground" />
              ) : (
                <Phone className="h-4 w-4 text-primary-foreground" />
              )}
            </div>
          </div>

          <h2 className="text-xl font-semibold text-foreground mb-1">
            {callerName}
          </h2>
          <p className="text-muted-foreground mb-6">
            Incoming {videoEnabled ? "video" : "voice"} call...
          </p>

          <div className="flex items-center justify-center gap-6">
            <Button
              variant="destructive"
              size="icon"
              className="h-14 w-14 rounded-full"
              onClick={onReject}
            >
              <PhoneOff className="h-6 w-6" />
            </Button>

            <Button
              size="icon"
              className="h-14 w-14 rounded-full bg-green-500 hover:bg-green-600"
              onClick={onAccept}
            >
              <Phone className="h-6 w-6" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};
