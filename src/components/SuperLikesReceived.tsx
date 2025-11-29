import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Star, Heart, Loader2, ChevronDown, ChevronUp } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { useToast } from "@/hooks/use-toast";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";

interface SuperLiker {
  id: string;
  user_id: string;
  name: string;
  age: number | null;
  photo_urls: string[];
  created_at: string;
  is_matched: boolean;
}

interface SuperLikesReceivedProps {
  currentUserId: string;
  onLikeBack?: (userId: string) => void;
}

export const SuperLikesReceived = ({ currentUserId, onLikeBack }: SuperLikesReceivedProps) => {
  const [superLikers, setSuperLikers] = useState<SuperLiker[]>([]);
  const [loading, setLoading] = useState(true);
  const [isOpen, setIsOpen] = useState(true);
  const [likingBack, setLikingBack] = useState<string | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    fetchSuperLikes();
    
    // Subscribe to new super likes
    const channel = supabase
      .channel('super-likes-received')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'super_likes',
          filter: `super_liked_user_id=eq.${currentUserId}`
        },
        () => {
          fetchSuperLikes();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [currentUserId]);

  const fetchSuperLikes = async () => {
    try {
      // Get super likes received
      const { data: superLikesData, error: superLikesError } = await (supabase
        .from("super_likes" as any)
        .select("id, user_id, created_at")
        .eq("super_liked_user_id", currentUserId)
        .order("created_at", { ascending: false }) as any);

      if (superLikesError) throw superLikesError;

      if (!superLikesData || superLikesData.length === 0) {
        setSuperLikers([]);
        setLoading(false);
        return;
      }

      // Get profiles of super likers
      const userIds = superLikesData.map((sl: any) => sl.user_id);
      const { data: profilesData, error: profilesError } = await supabase
        .from("profiles")
        .select("user_id, name, age, photo_urls")
        .in("user_id", userIds);

      if (profilesError) throw profilesError;

      // Check if current user has liked them back (for match status)
      const { data: myLikes, error: myLikesError } = await supabase
        .from("likes")
        .select("liked_user_id")
        .eq("user_id", currentUserId)
        .in("liked_user_id", userIds);

      if (myLikesError) throw myLikesError;

      const myLikedIds = new Set(myLikes?.map(l => l.liked_user_id) || []);

      // Combine data
      const combined: SuperLiker[] = superLikesData.map((sl: any) => {
        const profile = profilesData?.find(p => p.user_id === sl.user_id);
        return {
          id: sl.id,
          user_id: sl.user_id,
          name: profile?.name || "Unknown",
          age: profile?.age || null,
          photo_urls: profile?.photo_urls || [],
          created_at: sl.created_at,
          is_matched: myLikedIds.has(sl.user_id),
        };
      });

      setSuperLikers(combined);
    } catch (error) {
      console.error("Error fetching super likes:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleLikeBack = async (superLiker: SuperLiker) => {
    if (superLiker.is_matched) return;
    
    setLikingBack(superLiker.user_id);
    try {
      const { error } = await supabase
        .from("likes")
        .insert([{
          user_id: currentUserId,
          liked_user_id: superLiker.user_id
        }]);

      if (error) throw error;

      // Update local state
      setSuperLikers(prev => 
        prev.map(sl => 
          sl.user_id === superLiker.user_id 
            ? { ...sl, is_matched: true } 
            : sl
        )
      );

      toast({
        title: "It's a match! 🎉",
        description: `You and ${superLiker.name} can now message each other!`,
      });

      onLikeBack?.(superLiker.user_id);
    } catch (error: any) {
      console.error("Error liking back:", error);
      toast({
        title: "Error",
        description: "Failed to like back. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLikingBack(null);
    }
  };

  if (loading) {
    return (
      <div className="border-b border-border bg-gradient-to-r from-amber-500/10 to-amber-600/5 px-4 py-3">
        <div className="flex items-center gap-2">
          <Star className="h-4 w-4 text-amber-500" />
          <span className="text-sm font-medium">Loading Super Likes...</span>
        </div>
      </div>
    );
  }

  if (superLikers.length === 0) {
    return null;
  }

  const unmatchedCount = superLikers.filter(sl => !sl.is_matched).length;

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <div className="border-b border-amber-500/20 bg-gradient-to-r from-amber-500/10 to-amber-600/5">
        <CollapsibleTrigger className="flex w-full items-center justify-between px-4 py-3 hover:bg-amber-500/5 transition-colors">
          <div className="flex items-center gap-2">
            <Star className="h-5 w-5 text-amber-500 fill-amber-500" />
            <span className="font-semibold text-amber-700 dark:text-amber-400">
              Super Likes
            </span>
            {unmatchedCount > 0 && (
              <Badge className="bg-amber-500 text-white hover:bg-amber-600">
                {unmatchedCount} new
              </Badge>
            )}
          </div>
          {isOpen ? (
            <ChevronUp className="h-4 w-4 text-muted-foreground" />
          ) : (
            <ChevronDown className="h-4 w-4 text-muted-foreground" />
          )}
        </CollapsibleTrigger>

        <CollapsibleContent>
          <ScrollArea className="w-full">
            <div className="flex gap-3 px-4 pb-4">
              {superLikers.map((superLiker) => (
                <div
                  key={superLiker.id}
                  className="flex flex-col items-center gap-2 min-w-[100px]"
                >
                  <div className="relative">
                    <Avatar className="h-16 w-16 ring-2 ring-amber-500 ring-offset-2 ring-offset-background">
                      <AvatarImage src={superLiker.photo_urls?.[0]} alt={superLiker.name} />
                      <AvatarFallback className="bg-amber-100 text-amber-700">
                        {superLiker.name[0]}
                      </AvatarFallback>
                    </Avatar>
                    <div className="absolute -bottom-1 -right-1 bg-amber-500 rounded-full p-1">
                      <Star className="h-3 w-3 text-white fill-white" />
                    </div>
                  </div>
                  
                  <div className="text-center">
                    <p className="text-sm font-medium truncate max-w-[90px]">
                      {superLiker.name}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {formatDistanceToNow(new Date(superLiker.created_at), { addSuffix: true })}
                    </p>
                  </div>

                  {superLiker.is_matched ? (
                    <Badge variant="secondary" className="text-xs">
                      Matched ✓
                    </Badge>
                  ) : (
                    <Button
                      size="sm"
                      onClick={() => handleLikeBack(superLiker)}
                      disabled={likingBack === superLiker.user_id}
                      className="h-7 text-xs bg-primary hover:bg-primary/90"
                    >
                      {likingBack === superLiker.user_id ? (
                        <Loader2 className="h-3 w-3 animate-spin" />
                      ) : (
                        <>
                          <Heart className="h-3 w-3 mr-1" />
                          Like Back
                        </>
                      )}
                    </Button>
                  )}
                </div>
              ))}
            </div>
            <ScrollBar orientation="horizontal" />
          </ScrollArea>
        </CollapsibleContent>
      </div>
    </Collapsible>
  );
};
