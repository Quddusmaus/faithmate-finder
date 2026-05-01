import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { formatDistanceToNow } from "date-fns";
import { Loader2 } from "lucide-react";

interface Match {
  match_id: string;
  name: string;
  age: number | null;
  location: string | null;
  photo_urls: string[];
  last_message: string | null;
  last_message_at: string | null;
  unread_count: number;
}

interface MatchesListProps {
  matches: Match[];
  loading: boolean;
  selectedMatchId?: string;
  onSelectMatch: (match: Match) => void;
}

export const MatchesList = ({ matches, loading, selectedMatchId, onSelectMatch }: MatchesListProps) => {
  if (loading) {
    return (
      <div className="flex h-full items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (matches.length === 0) {
    return (
      <div className="flex h-full items-center justify-center p-6">
        <div className="text-center">
          <p className="text-muted-foreground">No matches yet</p>
          <p className="mt-2 text-sm text-muted-foreground">
            Start liking profiles to make connections!
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col">
      <div className="border-b border-border px-6 py-4">
        <h2 className="text-xl font-semibold">Your Matches</h2>
        <p className="text-sm text-muted-foreground">{matches.length} connections</p>
      </div>

      <div className="flex-1 overflow-y-auto">
        {matches.map((match) => (
          <button
            key={match.match_id}
            onClick={() => onSelectMatch(match)}
            className={`flex w-full items-start gap-3 border-b border-border p-4 text-left transition-colors hover:bg-muted/50 ${
              selectedMatchId === match.match_id ? 'bg-muted' : ''
            }`}
          >
            <Avatar className="h-12 w-12">
              <AvatarImage src={match.photo_urls?.[0]} alt={match.name} />
              <AvatarFallback>{match.name?.[0] ?? "?"}</AvatarFallback>
            </Avatar>

            <div className="flex-1 overflow-hidden">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold">{match.name}</h3>
                {match.last_message_at && (
                  <span className="text-xs text-muted-foreground">
                    {formatDistanceToNow(new Date(match.last_message_at), { addSuffix: true })}
                  </span>
                )}
              </div>

              {match.last_message && (
                <p className="truncate text-sm text-muted-foreground">
                  {match.last_message}
                </p>
              )}

              {match.unread_count > 0 && (
                <Badge variant="default" className="mt-1">
                  {match.unread_count} new
                </Badge>
              )}
            </div>
          </button>
        ))}
      </div>
    </div>
  );
};