import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Heart, ArrowLeft } from "lucide-react";
import { Link } from "react-router-dom";
import { ProfileCard } from "@/components/ProfileCard";
import { useToast } from "@/hooks/use-toast";

interface Profile {
  id: string;
  name: string;
  age: number | null;
  location: string | null;
  bio: string | null;
  photo_urls: string[];
  gender: string | null;
  looking_for: string | null;
}

const Profiles = () => {
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    fetchProfiles();
  }, []);

  const fetchProfiles = async () => {
    try {
      const { data, error } = await supabase
        .from("demo_profiles")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      setProfiles(data || []);
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
            <Link to="/auth">
              <Button className="bg-primary hover:bg-primary/90">Sign In</Button>
            </Link>
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

        {loading ? (
          <div className="flex justify-center py-20">
            <div className="text-muted-foreground">Loading profiles...</div>
          </div>
        ) : (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {profiles.map((profile) => (
              <ProfileCard key={profile.id} profile={profile} />
            ))}
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
