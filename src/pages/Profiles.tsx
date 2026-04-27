import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Heart, ArrowLeft, LogOut, Settings, MessageCircle, Shield, Menu } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { ProfileCard } from "@/components/ProfileCard";
import { ProfileFilters } from "@/components/ProfileFilters";
import { useToast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";
import { NotificationBell } from "@/components/NotificationBell";
import { useCurrentUserProfile, calculateCompatibility } from "@/hooks/useCurrentUserProfile";
import { useAdminStatus } from "@/hooks/useAdminStatus";
import { useUnreadMessageCount } from "@/hooks/useUnreadMessageCount";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { SubscriptionBanner } from "@/components/SubscriptionBanner";
import { useLikeLimits } from "@/hooks/useLikeLimits";
import { useSubscription } from "@/hooks/useSubscription";
import { useCompStatus } from "@/hooks/useCompStatus";
import { getUserWithTimeout, withTimeout } from "@/lib/safeAuth";
import type { User as SupabaseUser } from "@supabase/supabase-js";

interface Profile {
  id: string;
  name: string;
  age: number | null;
  location: string | null;
  bio: string | null;
  photo_urls: string[];
  gender: string | null;
  looking_for: string | null;
  verified: boolean | null;
  interests?: string[];
}

const Profiles = () => {
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [filteredProfiles, setFilteredProfiles] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<SupabaseUser | null>(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [authResolved, setAuthResolved] = useState(false);
  const [hasFetchedProfiles, setHasFetchedProfiles] = useState(false);
  const { unreadCount: unreadMessageCount } = useUnreadMessageCount();
  const { isAdmin, isLoading: adminLoading } = useAdminStatus();
  const [filters, setFilters] = useState({
    ageRange: [18, 100] as [number, number],
    location: "",
    gender: "all",
    lookingFor: "all",
    verifiedOnly: false,
    minCompatibility: 0,
    interests: [] as string[],
  });
  const { toast } = useToast();
  const navigate = useNavigate();
  
  const { profile: currentUserProfile } = useCurrentUserProfile();
  const { subscribed, tier, isLoading: subscriptionStatusLoading } = useSubscription();
  const { canLike } = useLikeLimits();
  
  // Show upgrade banner only when like limit is reached (basic tier)
  const showLikeLimitBanner = user && subscribed && tier === 'basic' && !canLike;

  useEffect(() => {
    checkAuth();
  }, []);

  useEffect(() => {
    if (!authResolved) return;

    if (!user) {
      setLoading(false);
      return;
    }

    if (subscriptionStatusLoading || adminLoading) {
      return;
    }

    if (!subscribed && !isAdmin) {
      setLoading(false);
      navigate('/subscription', { replace: true });
      return;
    }

    if (!hasFetchedProfiles) {
      fetchProfiles();
    }
  }, [
    authResolved,
    user,
    subscribed,
    isAdmin,
    subscriptionStatusLoading,
    adminLoading,
    hasFetchedProfiles,
    navigate,
  ]);

  const checkAuth = async () => {
    try {
      const currentUser = await getUserWithTimeout(5000);
      if (!currentUser) {
        setLoading(false);
        navigate('/auth', { replace: true });
        return;
      }
      setUser(currentUser);
    } catch (error) {
      console.error('Profiles auth check failed:', error);
      toast({
        title: 'Session issue',
        description: 'We could not verify your session. Please sign in again.',
        variant: 'destructive',
      });
      setLoading(false);
      navigate('/auth', { replace: true });
    } finally {
      setAuthResolved(true);
    }
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    setUser(null);
    toast({
      title: "Signed out",
      description: "You have been signed out successfully.",
    });
  };

  const fetchProfiles = async () => {
    try {
      const currentUser = await getUserWithTimeout(5000);

      const [demoResult, profilesResult] = await Promise.all([
        withTimeout(
          supabase
            .from("demo_profiles")
            .select("*")
            .order("created_at", { ascending: false }),
          8000,
          'Demo profiles request timed out',
        ),
        withTimeout(
          supabase
            .from("profiles")
            .select("*")
            .order("created_at", { ascending: false }),
          8000,
          'Profiles request timed out',
        ),
      ]);

      if (demoResult.error) {
        console.error("Error fetching demo profiles:", demoResult.error);
      }

      if (profilesResult.error) {
        console.error("Error fetching profiles:", profilesResult.error);
      }

      const realProfiles = (profilesResult.data || []).filter((p) => p.user_id !== currentUser?.id);
      const allProfiles = [...(demoResult.data || []), ...realProfiles];

      setProfiles(allProfiles);
      setFilteredProfiles(allProfiles);
    } catch (error) {
      console.error("Error fetching profiles:", error);
      toast({
        title: "Error",
        description: "Failed to load profiles. Please try again.",
        variant: "destructive",
      });
    } finally {
      setHasFetchedProfiles(true);
      setLoading(false);
    }
  };

  const applyFilters = () => {
    let filtered = [...profiles];

    // Age filter
    filtered = filtered.filter(
      (profile) =>
        profile.age !== null &&
        profile.age >= filters.ageRange[0] &&
        profile.age <= filters.ageRange[1]
    );

    // Location filter
    if (filters.location.trim()) {
      filtered = filtered.filter((profile) =>
        profile.location?.toLowerCase().includes(filters.location.toLowerCase())
      );
    }

    // Gender filter
    if (filters.gender !== "all") {
      filtered = filtered.filter(
        (profile) => profile.gender?.toLowerCase() === filters.gender.toLowerCase()
      );
    }

    // Looking for filter
    if (filters.lookingFor !== "all") {
      filtered = filtered.filter(
        (profile) => profile.looking_for?.toLowerCase() === filters.lookingFor.toLowerCase()
      );
    }

    // Verified only filter
    if (filters.verifiedOnly) {
      filtered = filtered.filter((profile) => profile.verified === true);
    }

    // Interests filter
    if (filters.interests.length > 0) {
      filtered = filtered.filter((profile) =>
        filters.interests.some((interest) => profile.interests?.includes(interest))
      );
    }

    // Sort by compatibility score (highest first)
    const userInterests = currentUserProfile?.interests || [];
    
    // Min compatibility filter
    if (filters.minCompatibility > 0) {
      filtered = filtered.filter((profile) => {
        const { score } = calculateCompatibility(userInterests, profile.interests || []);
        return score >= filters.minCompatibility;
      });
    }

    filtered.sort((a, b) => {
      const scoreA = calculateCompatibility(userInterests, a.interests || []).score;
      const scoreB = calculateCompatibility(userInterests, b.interests || []).score;
      return scoreB - scoreA;
    });

    setFilteredProfiles(filtered);
  };

  const handleClearFilters = () => {
    setFilters({
      ageRange: [18, 100],
      location: "",
      gender: "all",
      lookingFor: "all",
      verifiedOnly: false,
      minCompatibility: 0,
      interests: [],
    });
  };

  useEffect(() => {
    applyFilters();
  }, [filters, profiles, currentUserProfile]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-muted to-background">
      <nav className="container mx-auto px-4 sm:px-6 py-4 sm:py-6">
        <div className="flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2">
            <Heart className="h-6 w-6 sm:h-8 sm:w-8 text-primary" fill="currentColor" />
            <span className="text-xl sm:text-2xl font-bold text-foreground">Unity Hearts</span>
          </Link>
          
          {/* Desktop Navigation */}
          <div className="hidden md:flex gap-2 lg:gap-4 items-center">
            <Link to="/">
              <Button variant="ghost" size="sm">
                <ArrowLeft className="mr-1 sm:mr-2 h-4 w-4" />
                <span className="hidden lg:inline">Back to Home</span>
                <span className="lg:hidden">Home</span>
              </Button>
            </Link>
            {user ? (
              <>
                <NotificationBell />
                {isAdmin && (
                  <Link to="/admin">
                    <Button variant="outline" size="sm" className="gap-1 lg:gap-2">
                      <Shield className="h-4 w-4" />
                      <span className="hidden lg:inline">Admin</span>
                    </Button>
                  </Link>
                )}
                <Link to="/messages">
                  <Button variant="outline" size="sm" className="relative">
                    <MessageCircle className="mr-1 lg:mr-2 h-4 w-4" />
                    <span className="hidden lg:inline">Messages</span>
                    {unreadMessageCount > 0 && (
                      <Badge className="ml-1 lg:ml-2 bg-destructive text-destructive-foreground text-xs">
                        {unreadMessageCount}
                      </Badge>
                    )}
                  </Button>
                </Link>
                <Link to="/profile-setup">
                  <Button variant="outline" size="sm">
                    <Settings className="mr-1 lg:mr-2 h-4 w-4" />
                    <span className="hidden lg:inline">My Profile</span>
                  </Button>
                </Link>
                <Button variant="ghost" size="sm" onClick={handleSignOut}>
                  <LogOut className="mr-1 lg:mr-2 h-4 w-4" />
                  <span className="hidden lg:inline">Sign Out</span>
                </Button>
              </>
            ) : (
              <Link to="/auth">
                <Button className="bg-primary hover:bg-primary/90" size="sm">Sign In</Button>
              </Link>
            )}
          </div>

          {/* Mobile Navigation */}
          <div className="flex md:hidden items-center gap-2">
            {user && <NotificationBell />}
            <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon">
                  <Menu className="h-6 w-6" />
                </Button>
              </SheetTrigger>
              <SheetContent side="right" className="w-[280px]">
                <div className="flex flex-col gap-3 mt-8">
                  <Link to="/" onClick={() => setMobileMenuOpen(false)}>
                    <Button variant="ghost" className="w-full justify-start">
                      <ArrowLeft className="mr-2 h-4 w-4" />
                      Back to Home
                    </Button>
                  </Link>
                  {user ? (
                    <>
                      {isAdmin && (
                        <Link to="/admin" onClick={() => setMobileMenuOpen(false)}>
                          <Button variant="outline" className="w-full justify-start gap-2">
                            <Shield className="h-4 w-4" />
                            Admin
                          </Button>
                        </Link>
                      )}
                      <Link to="/messages" onClick={() => setMobileMenuOpen(false)}>
                        <Button variant="outline" className="w-full justify-start relative">
                          <MessageCircle className="mr-2 h-4 w-4" />
                          Messages
                          {unreadMessageCount > 0 && (
                            <Badge className="ml-2 bg-destructive text-destructive-foreground">
                              {unreadMessageCount}
                            </Badge>
                          )}
                        </Button>
                      </Link>
                      <Link to="/profile-setup" onClick={() => setMobileMenuOpen(false)}>
                        <Button variant="outline" className="w-full justify-start">
                          <Settings className="mr-2 h-4 w-4" />
                          My Profile
                        </Button>
                      </Link>
                      <Button variant="ghost" className="w-full justify-start" onClick={() => { handleSignOut(); setMobileMenuOpen(false); }}>
                        <LogOut className="mr-2 h-4 w-4" />
                        Sign Out
                      </Button>
                    </>
                  ) : (
                    <Link to="/auth" onClick={() => setMobileMenuOpen(false)}>
                      <Button className="w-full bg-primary hover:bg-primary/90">Sign In</Button>
                    </Link>
                  )}
                </div>
              </SheetContent>
            </Sheet>
          </div>
        </div>
      </nav>

      <main className="container mx-auto px-4 sm:px-6 py-8 sm:py-12">
        {showLikeLimitBanner && <SubscriptionBanner type="likes" />}
        
        <div className="mb-8 sm:mb-12 text-center">
          <h1 className="mb-3 sm:mb-4 text-2xl sm:text-4xl font-bold text-foreground">Discover Your Match</h1>
          <p className="text-base sm:text-xl text-muted-foreground px-2">
            Browse profiles of Baháʼí singles seeking meaningful connections
          </p>
        </div>

        <div className="mb-8">
          <ProfileFilters
            filters={filters}
            onFiltersChange={setFilters}
            onClear={handleClearFilters}
          />
        </div>

        {loading ? (
          <div className="flex justify-center py-20">
            <div className="text-muted-foreground">
              Loading profiles...
            </div>
          </div>
        ) : (
          <>
            <div className="mb-6 text-center">
              <p className="text-sm text-muted-foreground">
                Showing {filteredProfiles.length} of {profiles.length} profiles
              </p>
            </div>
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {filteredProfiles.map((profile) => (
                <ProfileCard 
                  key={profile.id} 
                  profile={profile} 
                  userInterests={currentUserProfile?.interests || []}
                  currentUserId={user?.id || null}
                />
              ))}
            </div>
          </>
        )}

        {!loading && filteredProfiles.length === 0 && profiles.length > 0 && (
          <div className="py-20 text-center">
            <p className="text-muted-foreground">No profiles match your filters. Try adjusting them!</p>
          </div>
        )}

        {!loading && profiles.length === 0 && (
          <div className="py-20 text-center">
            <p className="text-muted-foreground">No profiles found. Check back soon!</p>
          </div>
        )}
      </main>
    </div>
  );
};

export default Profiles;
