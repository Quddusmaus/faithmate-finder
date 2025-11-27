import { Badge } from "@/components/ui/badge";
import { Sparkles } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface CompatibilityBadgeProps {
  score: number;
  sharedInterests: string[];
  variant?: "card" | "detail";
}

export const CompatibilityBadge = ({ score, sharedInterests, variant = "card" }: CompatibilityBadgeProps) => {
  if (score === 0) return null;

  const getScoreColor = () => {
    if (score >= 70) return "bg-green-500/90 text-white";
    if (score >= 40) return "bg-yellow-500/90 text-white";
    return "bg-primary/80 text-primary-foreground";
  };

  if (variant === "card") {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <Badge className={`gap-1 ${getScoreColor()}`}>
              <Sparkles className="h-3 w-3" />
              {score}% Match
            </Badge>
          </TooltipTrigger>
          <TooltipContent>
            <p className="font-medium">{sharedInterests.length} shared interests</p>
            <p className="text-xs text-muted-foreground">
              {sharedInterests.join(", ")}
            </p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  return (
    <div className="rounded-lg border border-primary/20 bg-primary/5 p-4">
      <div className="flex items-center gap-2 mb-2">
        <Sparkles className="h-5 w-5 text-primary" />
        <span className="font-semibold text-foreground">{score}% Compatibility</span>
      </div>
      {sharedInterests.length > 0 && (
        <div>
          <p className="text-sm text-muted-foreground mb-2">Shared interests:</p>
          <div className="flex flex-wrap gap-1">
            {sharedInterests.map((interest) => (
              <Badge key={interest} variant="secondary" className="bg-primary/20 text-primary text-xs">
                {interest}
              </Badge>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
