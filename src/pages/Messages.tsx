import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Heart, ArrowLeft } from "lucide-react";
import { Link } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import { MatchesList } from "@/components/MatchesList";
import { ChatWindow } from "@/components/ChatWindow";
import { NotificationBell } from "@/components/NotificationBell";
import { IncomingCallDialog } from "@/components/IncomingCallDialog";
import type { User } from "@supabase/supabase-js";

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

const Messages = () => {
  const [user, setUser] = useState<User | null>(null);
  const [matches, setMatches] = useState<Match[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedMatch, setSelectedMatch] = useState<Match | null>(null);
  const [incomingCallData, setIncomingCallData] = useState<{
    callerId: string;
    callerName: string;
    callerPhoto?: string;
    offerData: any;
  } | null>(null);
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    checkAuth();
  }, []);

  useEffect(() => {
    if (user) {
      fetchMatches();
    }
  }, [user]);

  useEffect(() => {
    const matchId = searchParams.get('match');
    if (matchId && matches.length > 0) {
      const match = matches.find(m => m.match_id === matchId);
      if (match) {
        setSelectedMatch(match);
      }
    }
  }, [searchParams, matches]);

  const checkAuth = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      navigate("/auth");
      return;
    }
    setUser(user);
  };

  const fetchMatches = async () => {
    try {
      if (!user) return;

      const { data, error } = await supabase.rpc('get_user_matches', {
        user_uuid: user.id
      });

      if (error) throw error;
      setMatches(data || []);
    } catch (error: any) {
      console.error("Error fetching matches:", error);
      toast({
        title: "Error",
        description: "Failed to load matches.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSelectMatch = (match: Match) => {
    setSelectedMatch(match);
    setSearchParams({ match: match.match_id });
  };

  const handleBackToList = () => {
    setSelectedMatch(null);
    setSearchParams({});
  };

  const handleAcceptCall = (call: { callerId: string; callerName: string; callerPhoto?: string; offerData: any }) => {
    // Find the match for this caller
    const callerMatch = matches.find(m => m.match_id === call.callerId);
    if (callerMatch) {
      setSelectedMatch(callerMatch);
      setSearchParams({ match: call.callerId });
      setIncomingCallData(call);
    }
  };

  const handleRejectCall = (callerId: string) => {
    toast({
      title: "Call Rejected",
      description: "You declined the incoming call.",
    });
  };

  if (!user) {
    return null;
  }

  return (
    <div className="flex h-screen flex-col bg-background">
      {/* Incoming call dialog */}
      {user && (
        <IncomingCallDialog
          userId={user.id}
          onAccept={handleAcceptCall}
          onReject={handleRejectCall}
        />
      )}

      <nav className="border-b border-border bg-card px-6 py-4">
        <div className="flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2">
            <Heart className="h-8 w-8 text-primary" fill="currentColor" />
            <span className="text-2xl font-bold text-foreground">Unity Hearts</span>
          </Link>
          <div className="flex gap-3">
            <NotificationBell />
            <Link to="/profiles">
              <Button variant="ghost">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Browse Profiles
              </Button>
            </Link>
            <Link to="/profile-setup">
              <Button variant="outline">My Profile</Button>
            </Link>
          </div>
        </div>
      </nav>

      <div className="flex flex-1 overflow-hidden">
        {/* Matches sidebar */}
        <div className={`${selectedMatch ? 'hidden md:block' : 'block'} w-full border-r border-border bg-card md:w-96`}>
          <MatchesList
            matches={matches}
            loading={loading}
            selectedMatchId={selectedMatch?.match_id}
            onSelectMatch={handleSelectMatch}
          />
        </div>

        {/* Chat window */}
        <div className={`${selectedMatch ? 'block' : 'hidden md:block'} flex-1`}>
          {selectedMatch ? (
            <ChatWindow
              user={user}
              match={selectedMatch}
              onBack={handleBackToList}
              incomingCallData={incomingCallData}
              onCallHandled={() => setIncomingCallData(null)}
            />
          ) : (
            <div className="flex h-full items-center justify-center">
              <div className="text-center">
                <Heart className="mx-auto h-16 w-16 text-muted-foreground/30" />
                <p className="mt-4 text-lg text-muted-foreground">
                  Select a match to start chatting
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Messages;