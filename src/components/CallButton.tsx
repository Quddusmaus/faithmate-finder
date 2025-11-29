import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { Phone, Video, Crown, Loader2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Link } from "react-router-dom";

interface CallButtonProps {
  onVoiceCall: () => void;
  onVideoCall: () => void;
  canMakeCall: boolean;
  remainingCalls: number | null;
  maxCalls: number | null;
  tier: string | null;
  isLoading?: boolean;
}

export const CallButton = ({ 
  onVoiceCall, 
  onVideoCall, 
  canMakeCall,
  remainingCalls,
  maxCalls,
  tier,
  isLoading = false,
}: CallButtonProps) => {
  const getCallsDisplay = () => {
    if (isLoading) return null;
    if (maxCalls === null) return <Badge variant="secondary" className="bg-amber-500/20 text-amber-600 text-xs">Unlimited</Badge>;
    if (maxCalls === 0) return <Badge variant="destructive" className="text-xs">No calls</Badge>;
    return (
      <Badge variant="secondary" className="text-xs">
        {remainingCalls}/{maxCalls} left
      </Badge>
    );
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button 
          variant="ghost" 
          size="icon"
          disabled={isLoading}
          className="relative"
        >
          {isLoading ? (
            <Loader2 className="h-5 w-5 animate-spin" />
          ) : (
            <Phone className="h-5 w-5" />
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <div className="px-2 py-1.5 flex items-center justify-between">
          <span className="text-sm font-medium">Calls Today</span>
          {getCallsDisplay()}
        </div>
        <DropdownMenuSeparator />
        
        {canMakeCall ? (
          <>
            <DropdownMenuItem onClick={onVoiceCall}>
              <Phone className="h-4 w-4 mr-2" />
              Voice Call
            </DropdownMenuItem>
            <DropdownMenuItem onClick={onVideoCall}>
              <Video className="h-4 w-4 mr-2" />
              Video Call
            </DropdownMenuItem>
          </>
        ) : (
          <>
            <DropdownMenuItem disabled className="opacity-50">
              <Phone className="h-4 w-4 mr-2" />
              Voice Call
            </DropdownMenuItem>
            <DropdownMenuItem disabled className="opacity-50">
              <Video className="h-4 w-4 mr-2" />
              Video Call
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <div className="p-2">
              {!tier ? (
                <div className="text-xs text-muted-foreground text-center">
                  <p className="mb-2">Subscribe to make video and voice calls</p>
                  <Link to="/subscription">
                    <Button size="sm" className="w-full gap-1">
                      <Crown className="h-3 w-3" />
                      Subscribe Now
                    </Button>
                  </Link>
                </div>
              ) : tier === 'basic' ? (
                <div className="text-xs text-muted-foreground text-center">
                  <p className="mb-2">Daily call used. Upgrade to Premium for unlimited calls.</p>
                  <Link to="/subscription">
                    <Button size="sm" variant="outline" className="w-full gap-1">
                      <Crown className="h-3 w-3" />
                      Go Premium
                    </Button>
                  </Link>
                </div>
              ) : (
                <div className="text-xs text-muted-foreground text-center">
                  <p>Daily limit reached. Try again tomorrow.</p>
                </div>
              )}
            </div>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
};
