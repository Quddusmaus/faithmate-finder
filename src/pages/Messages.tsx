import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Heart, ArrowLeft, Menu, Settings } from "lucide-react";
import { Link } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import { MatchesList } from "@/components/MatchesList";
import { ChatWindow } from "@/components/ChatWindow";
import { NotificationBell } from "@/components/NotificationBell";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
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
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
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

      console.log('Messages: Fetching matches for user', user.id);
      
      const { data, error } = await supabase.rpc('get_user_matches', {
        user_uuid: user.id
      });

      if (error) throw error;
      
      console.log('Messages: Received matches', data?.map(m => ({ 
        name: m.name, 
        unread_count: m.unread_count 
      })));
      
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
    // Clear unread count optimistically when selecting a match
    setMatches(current =>
      current.map(m =>
        m.match_id === match.match_id ? { ...m, unread_count: 0 } : m
      )
    );
  };

  const handleMessagesRead = () => {
    // Refresh matches to get updated unread counts
    fetchMatches();
  };

  const handleBackToList = () => {
    setSelectedMatch(null);
    setSearchParams({});
  };

  if (!user) {
    return null;
  }

  return (
    <div className="flex h-screen flex-col bg-background">
      <nav className="border-b border-border bg-card px-4 sm:px-6 py-3 sm:py-4">
        <div className="flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2">
            <Heart className="h-6 w-6 sm:h-8 sm:w-8 text-primary" fill="currentColor" />
            <span className="text-lg sm:text-2xl font-bold text-foreground">Unity Hearts</span>
          </Link>
          
          {/* Desktop Navigation */}
          <div className="hidden sm:flex gap-3 items-center">
            <NotificationBell />
            <Link to="/profiles">
              <Button variant="ghost" size="sm">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Browse Profiles
              </Button>
            </Link>
            <Link to="/profile-setup">
              <Button variant="outline" size="sm">My Profile</Button>
            </Link>
          </div>

          {/* Mobile Navigation */}
          <div className="flex sm:hidden items-center gap-2">
            <NotificationBell />
            <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon">
                  <Menu className="h-5 w-5" />
                </Button>
              </SheetTrigger>
              <SheetContent side="right" className="w-[250px]">
                <div className="flex flex-col gap-3 mt-8">
                  <Link to="/profiles" onClick={() => setMobileMenuOpen(false)}>
                    <Button variant="ghost" className="w-full justify-start">
                      <ArrowLeft className="mr-2 h-4 w-4" />
                      Browse Profiles
                    </Button>
                  </Link>
                  <Link to="/profile-setup" onClick={() => setMobileMenuOpen(false)}>
                    <Button variant="outline" className="w-full justify-start">
                      <Settings className="mr-2 h-4 w-4" />
                      My Profile
                    </Button>
                  </Link>
                </div>
              </SheetContent>
            </Sheet>
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
              onMessagesRead={handleMessagesRead}
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
