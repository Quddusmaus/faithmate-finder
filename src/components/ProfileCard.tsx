import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { MapPin, Heart } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useState, useEffect, useMemo, useCallback } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { ReportProfileDialog } from "./ReportProfileDialog";
import { BlockUserDialog } from "./BlockUserDialog";
import { CompatibilityBadge } from "./CompatibilityBadge";
import { calculateCompatibility } from "@/hooks/useCurrentUserProfile";

interface Profile {
  id: string;
  name: string;
  age: number | null;
  location: string | null;
  bio: string | null;
  photo_urls: string[];
  gender: string | null;
  looking_for: string | null;
  user_id?: string;
  verified: boolean | null;
  interests?: string[];
}

interface ProfileCardProps {
  profile: Profile;
  userInterests?: string[];
  currentUserId?: string | null;
}

export const ProfileCard = ({ profile, userInterests = [], currentUserId }: ProfileCardProps) => {
  const [showDetails, setShowDetails] = useState(false);
  const [liked, setLiked] = useState(false);
  const [liking, setLiking] = useState(false);
  const { toast } = useToast();
  const imageUrl = profile.photo_urls[0] || "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=400";

  const compatibility = useMemo(() => {
    return calculateCompatibility(userInterests, profile.interests || []);
  }, [userInterests, profile.interests]);

  // Check if liked only when dialog opens (lazy load)
  const checkIfLiked = useCallback(async () => {
    if (!currentUserId || !profile.user_id) return;

    try {
      const { data } = await supabase
        .from("likes")
        .select("id")
        .eq("user_id", currentUserId)
        .eq("liked_user_id", profile.user_id)
        .maybeSingle();

      setLiked(!!data);
    } catch (error) {
      console.error("Error checking like status:", error);
    }
  }, [currentUserId, profile.user_id]);

  // Only check like status when dialog opens
  useEffect(() => {
    if (showDetails && currentUserId && profile.user_id) {
      checkIfLiked();
    }
  }, [showDetails, currentUserId, profile.user_id, checkIfLiked]);

  const handleLike = async () => {
    if (!currentUserId) {
      toast({
        title: "Sign in required",
        description: "Please sign in to like profiles.",
        variant: "destructive",
      });
      return;
    }

    if (!profile.user_id) {
      toast({
        title: "Cannot like this profile",
        description: "This is a demo profile.",
        variant: "destructive",
      });
      return;
    }

    setLiking(true);
    try {
      if (liked) {
        const { error } = await supabase
          .from("likes")
          .delete()
          .eq("user_id", currentUserId)
          .eq("liked_user_id", profile.user_id);

        if (error) throw error;
        setLiked(false);
        toast({
          title: "Unliked",
          description: "Profile removed from your likes.",
        });
      } else {
        const { error } = await supabase
          .from("likes")
          .insert([{
            user_id: currentUserId,
            liked_user_id: profile.user_id
          }]);

        if (error) throw error;
        setLiked(true);

        // Check if it's a match
        const { data: matchData } = await supabase
          .from("likes")
          .select("id")
          .eq("user_id", profile.user_id)
          .eq("liked_user_id", currentUserId)
          .maybeSingle();

        if (matchData) {
          toast({
            title: "It's a match! 🎉",
            description: `You and ${profile.name} liked each other!`,
          });
        } else {
          toast({
            title: "Liked",
            description: "Profile added to your likes.",
          });
        }
      }
    } catch (error: any) {
      console.error("Error toggling like:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to update like status.",
        variant: "destructive",
      });
    } finally {
      setLiking(false);
    }
  };

  return (
    <>
      <Card className="group overflow-hidden transition-all hover:shadow-xl">
        <div className="relative aspect-[3/4] overflow-hidden">
          <img
            src={imageUrl}
            alt={profile.name}
            className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
          
          {compatibility.score > 0 && (
            <div className="absolute top-4 right-4">
              <CompatibilityBadge 
                score={compatibility.score} 
                sharedInterests={compatibility.shared} 
              />
            </div>
          )}
          
            <div className="absolute bottom-0 left-0 right-0 p-6 text-white">
            <div className="mb-1 flex items-center gap-2">
              <h3 className="text-2xl font-bold">
                {profile.name}
                {profile.age && `, ${profile.age}`}
              </h3>
            </div>
            {profile.location && (
              <div className="flex items-center gap-1 text-sm text-white/90">
                <MapPin className="h-4 w-4" />
                <span>{profile.location}</span>
              </div>
            )}
          </div>
        </div>

        <CardContent className="p-6">
          <p className="mb-4 line-clamp-2 text-muted-foreground">
            {profile.bio || "No bio available"}
          </p>

          <div className="flex gap-2">
            <Button
              className="flex-1 bg-primary hover:bg-primary/90"
              onClick={() => setShowDetails(true)}
            >
              View Profile
            </Button>
            {currentUserId && profile.user_id && (
              <Button 
                variant={liked ? "default" : "outline"} 
                size="icon" 
                onClick={handleLike}
                disabled={liking}
                className={liked ? "bg-primary text-primary-foreground" : "border-primary text-primary hover:bg-primary hover:text-primary-foreground"}
              >
                <Heart className={`h-4 w-4 ${liked ? 'fill-current' : ''}`} />
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      <Dialog open={showDetails} onOpenChange={setShowDetails}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto overscroll-contain touch-pan-y">
          <DialogHeader>
            <DialogTitle className="text-xl sm:text-2xl">
              {profile.name}
              {profile.age && `, ${profile.age}`}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-6">
            <div className="aspect-video overflow-hidden rounded-lg">
              <img
                src={imageUrl}
                alt={profile.name}
                className="h-full w-full object-cover"
              />
            </div>

            {compatibility.score > 0 && (
              <CompatibilityBadge 
                score={compatibility.score} 
                sharedInterests={compatibility.shared}
                variant="detail"
              />
            )}

            {profile.location && (
              <div className="flex items-center gap-2 text-muted-foreground">
                <MapPin className="h-5 w-5" />
                <span>{profile.location}</span>
              </div>
            )}

            {profile.bio && (
              <div>
                <h4 className="mb-2 font-semibold text-foreground">About</h4>
                <p className="text-muted-foreground">{profile.bio}</p>
              </div>
            )}

            {profile.interests && profile.interests.length > 0 && (
              <div>
                <h4 className="mb-2 font-semibold text-foreground">Interests & Activities</h4>
                <div className="flex flex-wrap gap-2">
                  {profile.interests.map((interest) => (
                    <Badge key={interest} variant="secondary" className="bg-primary/10 text-primary">
                      {interest}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            <div className="flex gap-2">
              {profile.gender && (
                <Badge variant="secondary">{profile.gender}</Badge>
              )}
              {profile.looking_for && (
                <Badge variant="outline">Looking for: {profile.looking_for}</Badge>
              )}
            </div>

            {currentUserId && profile.user_id ? (
              <Button 
                onClick={handleLike}
                disabled={liking}
                className={`w-full ${liked ? 'bg-muted hover:bg-muted/80' : 'bg-primary hover:bg-primary/90'}`}
              >
                <Heart className={`mr-2 h-4 w-4 ${liked ? 'fill-current' : ''}`} />
                {liked ? 'Unlike Profile' : 'Like Profile'}
              </Button>
            ) : (
              <Button className="w-full bg-primary hover:bg-primary/90" disabled>
                <Heart className="mr-2 h-4 w-4" />
                {!currentUserId ? 'Sign in to like' : 'Demo profile'}
              </Button>
            )}

            {currentUserId && profile.user_id && (
              <div className="flex items-center justify-end gap-2 pt-2">
                <BlockUserDialog
                  userId={profile.user_id}
                  userName={profile.name}
                  onBlock={() => setShowDetails(false)}
                />
                <ReportProfileDialog
                  profileId={profile.id}
                  profileName={profile.name}
                  currentUserId={currentUserId}
                />
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};
