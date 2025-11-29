import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { MapPin, Heart, Crown, Star } from "lucide-react";
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
import { useLikeLimits } from "@/hooks/useLikeLimits";
import { useSuperLikeLimits } from "@/hooks/useSuperLikeLimits";
import { Link } from "react-router-dom";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

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
  const [superLiked, setSuperLiked] = useState(false);
  const [liking, setLiking] = useState(false);
  const [superLiking, setSuperLiking] = useState(false);
  const { toast } = useToast();
  const { canLike, remainingLikes, maxLikes, incrementLikeCount, tier, subscribed } = useLikeLimits();
  const { canSuperLike, remainingSuperLikes, maxSuperLikes, incrementSuperLikeCount } = useSuperLikeLimits();
  const imageUrl = profile.photo_urls[0] || "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=400";

  const compatibility = useMemo(() => {
    return calculateCompatibility(userInterests, profile.interests || []);
  }, [userInterests, profile.interests]);

  // Check if liked/super liked only when dialog opens (lazy load)
  const checkLikeStatus = useCallback(async () => {
    if (!currentUserId || !profile.user_id) return;

    try {
      const [likeResult, superLikeResult] = await Promise.all([
        supabase
          .from("likes")
          .select("id")
          .eq("user_id", currentUserId)
          .eq("liked_user_id", profile.user_id)
          .maybeSingle(),
        supabase
          .from("super_likes")
          .select("id")
          .eq("user_id", currentUserId)
          .eq("super_liked_user_id", profile.user_id)
          .maybeSingle()
      ]);

      setLiked(!!likeResult.data);
      setSuperLiked(!!superLikeResult.data);
    } catch (error) {
      console.error("Error checking like status:", error);
    }
  }, [currentUserId, profile.user_id]);

  // Only check like status when dialog opens
  useEffect(() => {
    if (showDetails && currentUserId && profile.user_id) {
      checkLikeStatus();
    }
  }, [showDetails, currentUserId, profile.user_id, checkLikeStatus]);

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

    // Check like limit before liking (not for unlikes)
    if (!liked && !canLike) {
      toast({
        title: "Like limit reached",
        description: tier === 'basic' 
          ? "You've used all 20 likes for today. Upgrade to Premium for unlimited likes!"
          : "Daily limit reached. Try again tomorrow.",
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
        // Increment like count for Basic tier users
        if (subscribed && tier === 'basic') {
          const success = await incrementLikeCount();
          if (!success) return;
        }

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
          const likesInfo = maxLikes !== null && remainingLikes !== null 
            ? ` (${remainingLikes - 1} likes left today)`
            : '';
          toast({
            title: "Liked",
            description: `Profile added to your likes.${likesInfo}`,
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

  const handleSuperLike = async () => {
    if (!currentUserId) {
      toast({
        title: "Sign in required",
        description: "Please sign in to use Super Likes.",
        variant: "destructive",
      });
      return;
    }

    if (!profile.user_id) {
      toast({
        title: "Cannot super like this profile",
        description: "This is a demo profile.",
        variant: "destructive",
      });
      return;
    }

    if (superLiked) {
      toast({
        title: "Already Super Liked",
        description: "You've already sent a Super Like to this profile.",
      });
      return;
    }

    if (!subscribed) {
      toast({
        title: "Premium feature",
        description: "Super Likes are available for subscribers only.",
        variant: "destructive",
      });
      return;
    }

    if (!canSuperLike) {
      toast({
        title: "Super Like limit reached",
        description: tier === 'basic' 
          ? "You've used your Super Like for today. Upgrade to Premium for 5 daily!"
          : "You've used all Super Likes for today. Come back tomorrow!",
        variant: "destructive",
      });
      return;
    }

    setSuperLiking(true);
    try {
      const success = await incrementSuperLikeCount();
      if (!success) return;

      const { error } = await supabase
        .from("super_likes")
        .insert([{
          user_id: currentUserId,
          super_liked_user_id: profile.user_id
        }]);

      if (error) throw error;
      
      setSuperLiked(true);
      setLiked(true); // Super like also creates regular like via trigger
      
      const superLikesInfo = remainingSuperLikes !== null 
        ? ` (${remainingSuperLikes - 1} Super Likes left today)`
        : '';
      
      toast({
        title: "⭐ Super Like sent!",
        description: `${profile.name} will be notified about your Super Like!${superLikesInfo}`,
      });
    } catch (error: any) {
      console.error("Error sending super like:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to send Super Like.",
        variant: "destructive",
      });
    } finally {
      setSuperLiking(false);
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

          <div className="flex flex-col gap-2">
            {subscribed && tier === 'basic' && maxLikes !== null && (
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span>{remainingLikes} likes left today</span>
                {remainingLikes !== null && remainingLikes <= 5 && (
                  <Link to="/subscription" className="text-primary hover:underline flex items-center gap-1">
                    <Crown className="h-3 w-3" />
                    Go unlimited
                  </Link>
                )}
              </div>
            )}
            <div className="flex gap-2">
              <Button
                className="flex-1 bg-primary hover:bg-primary/90"
                onClick={() => setShowDetails(true)}
              >
                View Profile
              </Button>
              {currentUserId && profile.user_id && (
                <>
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button 
                          variant={superLiked ? "default" : "outline"} 
                          size="icon" 
                          onClick={handleSuperLike}
                          disabled={superLiking || superLiked || !subscribed}
                          className={superLiked 
                            ? "bg-amber-500 text-white hover:bg-amber-600" 
                            : subscribed 
                              ? "border-amber-500 text-amber-500 hover:bg-amber-500 hover:text-white"
                              : "border-muted text-muted-foreground"
                          }
                        >
                          <Star className={`h-4 w-4 ${superLiked ? 'fill-current' : ''}`} />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>
                        {!subscribed 
                          ? "Subscribe to send Super Likes" 
                          : superLiked 
                            ? "Super Like sent!" 
                            : `Super Like (${remainingSuperLikes ?? 0} left)`
                        }
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                  <Button 
                    variant={liked ? "default" : "outline"} 
                    size="icon" 
                    onClick={handleLike}
                    disabled={liking || (!liked && !canLike)}
                    className={liked ? "bg-primary text-primary-foreground" : "border-primary text-primary hover:bg-primary hover:text-primary-foreground"}
                  >
                    <Heart className={`h-4 w-4 ${liked ? 'fill-current' : ''}`} />
                  </Button>
                </>
              )}
            </div>
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
              <div className="space-y-3">
                {subscribed && tier === 'basic' && maxLikes !== null && !liked && (
                  <div className="flex items-center justify-between text-sm text-muted-foreground">
                    <span>{remainingLikes} likes remaining today</span>
                    {remainingLikes !== null && remainingLikes <= 5 && (
                      <Link to="/subscription" className="text-primary hover:underline flex items-center gap-1">
                        <Crown className="h-3 w-3" />
                        Upgrade for unlimited
                      </Link>
                    )}
                  </div>
                )}
                
                {/* Super Like Button */}
                {subscribed && !superLiked && (
                  <div className="flex items-center justify-between text-sm text-muted-foreground mb-2">
                    <span className="flex items-center gap-1">
                      <Star className="h-3 w-3 text-amber-500" />
                      {remainingSuperLikes ?? 0} Super Likes left today
                    </span>
                  </div>
                )}
                
                <Button 
                  onClick={handleSuperLike}
                  disabled={superLiking || superLiked || !subscribed}
                  className={`w-full ${
                    superLiked 
                      ? 'bg-amber-500 hover:bg-amber-600 text-white' 
                      : subscribed
                        ? 'bg-amber-500 hover:bg-amber-600 text-white'
                        : 'bg-muted text-muted-foreground'
                  }`}
                >
                  <Star className={`mr-2 h-4 w-4 ${superLiked ? 'fill-current' : ''}`} />
                  {superLiked 
                    ? 'Super Like Sent!' 
                    : subscribed 
                      ? 'Send Super Like ⭐' 
                      : 'Subscribe for Super Likes'
                  }
                </Button>
                
                {!canLike && !liked ? (
                  <div className="space-y-2">
                    <Button 
                      disabled
                      className="w-full bg-muted"
                    >
                      <Heart className="mr-2 h-4 w-4" />
                      Daily limit reached
                    </Button>
                    <Link to="/subscription" className="block">
                      <Button variant="outline" className="w-full gap-2">
                        <Crown className="h-4 w-4" />
                        Upgrade to Premium for unlimited likes
                      </Button>
                    </Link>
                  </div>
                ) : (
                  <Button 
                    onClick={handleLike}
                    disabled={liking}
                    variant="outline"
                    className={`w-full ${liked ? 'bg-muted hover:bg-muted/80' : ''}`}
                  >
                    <Heart className={`mr-2 h-4 w-4 ${liked ? 'fill-current' : ''}`} />
                    {liked ? 'Unlike Profile' : 'Like Profile'}
                  </Button>
                )}
              </div>
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
