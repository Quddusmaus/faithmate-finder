import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Heart, ArrowLeft, LogOut, Settings, MessageCircle, Shield } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { ProfileCard } from "@/components/ProfileCard";
import { ProfileFilters } from "@/components/ProfileFilters";
import { useToast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";
import { NotificationBell } from "@/components/NotificationBell";
import { useCurrentUserProfile, calculateCompatibility } from "@/hooks/useCurrentUserProfile";
import { useAdminStatus } from "@/hooks/useAdminStatus";
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
  const [matchCount, setMatchCount] = useState(0);
  const { isAdmin } = useAdminStatus();
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

  useEffect(() => {
    checkAuth();
    fetchProfiles();
  }, []);

  const checkAuth = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    setUser(user);
    
    if (user) {
      // Get match count
      const { data } = await supabase.rpc('get_user_matches', {
        user_uuid: user.id
      });
      setMatchCount(data?.length || 0);
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
      const currentUser = (await supabase.auth.getUser()).data.user;
      
      // Fetch demo profiles (public)
      const demoResult = await supabase
        .from("demo_profiles")
        .select("*")
        .order("created_at", { ascending: false });

      if (demoResult.error) {
        console.error("Error fetching demo profiles:", demoResult.error);
      }

      // Fetch real profiles (requires authentication due to RLS)
      const profilesResult = await supabase
        .from("profiles")
        .select("*")
        .order("created_at", { ascending: false });

      if (profilesResult.error) {
        console.error("Error fetching profiles:", profilesResult.error);
        // Don't throw - just use demo profiles if real profiles fail
      }

      // Combine and filter out current user's profile from the list
      const realProfiles = (profilesResult.data || []).filter(p => p.user_id !== currentUser?.id);
      const allProfiles = [
        ...(demoResult.data || []),
        ...realProfiles
      ];

      console.log("Fetched profiles:", { 
        demoCount: demoResult.data?.length || 0, 
        realCount: realProfiles.length,
        isAuthenticated: !!currentUser 
      });

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
      <nav className="container mx-auto px-6 py-6">
        <div className="flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2">
            <Heart className="h-8 w-8 text-primary" fill="currentColor" />
            <span className="text-2xl font-bold text-foreground">Unity Hearts</span>
          </Link>
          <div className="flex gap-4">
            <Link to="/">
              <Button variant="ghost">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back to Home
              </Button>
            </Link>
            {user ? (
              <>
                <NotificationBell />
                {isAdmin && (
                  <Link to="/admin">
                    <Button variant="outline" className="gap-2">
                      <Shield className="h-4 w-4" />
                      Admin
                    </Button>
                  </Link>
                )}
                <Link to="/messages">
                  <Button variant="outline" className="relative">
                    <MessageCircle className="mr-2 h-4 w-4" />
                    Messages
                    {matchCount > 0 && (
                      <Badge className="ml-2 bg-primary text-primary-foreground">
                        {matchCount}
                      </Badge>
                    )}
                  </Button>
                </Link>
                <Link to="/profile-setup">
                  <Button variant="outline">
                    <Settings className="mr-2 h-4 w-4" />
                    My Profile
                  </Button>
                </Link>
                <Button variant="ghost" onClick={handleSignOut}>
                  <LogOut className="mr-2 h-4 w-4" />
                  Sign Out
                </Button>
              </>
            ) : (
              <Link to="/auth">
                <Button className="bg-primary hover:bg-primary/90">Sign In</Button>
              </Link>
            )}
          </div>
        </div>
      </nav>

      <main className="container mx-auto px-6 py-12">
        <div className="mb-12 text-center">
          <h1 className="mb-4 text-4xl font-bold text-foreground">Discover Your Match</h1>
          <p className="text-xl text-muted-foreground">
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
            <div className="text-muted-foreground">Loading profiles...</div>
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
