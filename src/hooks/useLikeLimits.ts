import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useSubscription, SubscriptionTier } from '@/hooks/useSubscription';
import { toast } from '@/hooks/use-toast';

interface LikeLimits {
  maxLikes: number | null; // null means unlimited
  usedLikes: number;
  remainingLikes: number | null; // null means unlimited
  canLike: boolean;
  isLoading: boolean;
}

// Like limits per tier - Basic gets 20 likes/day, Premium gets unlimited
const TIER_LIKE_LIMITS: Record<string, number | null> = {
  basic: 20, // 20 likes per day
  premium: null, // Unlimited
};

export function useLikeLimits() {
  const { tier, subscribed, isLoading: subscriptionLoading } = useSubscription();
  const [usedLikes, setUsedLikes] = useState(0);
  const [isLoading, setIsLoading] = useState(true);

  const maxLikes = subscribed && tier ? TIER_LIKE_LIMITS[tier] : null; // Non-subscribers get unlimited (free tier)
  
  const remainingLikes = maxLikes === null 
    ? null 
    : Math.max(0, maxLikes - usedLikes);
  
  const canLike = maxLikes === null || usedLikes < maxLikes;

  const fetchUsedLikes = useCallback(async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setIsLoading(false);
        return;
      }

      const { data, error } = await supabase
        .rpc('get_today_like_count', { p_user_id: user.id });

      if (error) {
        console.error('Error fetching like count:', error);
      } else {
        setUsedLikes(data || 0);
      }
    } catch (error) {
      console.error('Error fetching like count:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const incrementLikeCount = useCallback(async (): Promise<boolean> => {
    // Check if user can like first
    if (!canLike) {
      toast({
        title: 'Like limit reached',
        description: getLimitMessage(tier, maxLikes),
        variant: 'destructive',
      });
      return false;
    }

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        return false;
      }

      const { data, error } = await supabase
        .rpc('increment_like_count', { p_user_id: user.id });

      if (error) {
        console.error('Error incrementing like count:', error);
        return false;
      }

      setUsedLikes(data || usedLikes + 1);
      return true;
    } catch (error) {
      console.error('Error incrementing like count:', error);
      return false;
    }
  }, [canLike, tier, maxLikes, usedLikes]);

  useEffect(() => {
    if (!subscriptionLoading) {
      fetchUsedLikes();
    }
  }, [subscriptionLoading, fetchUsedLikes]);

  return {
    maxLikes,
    usedLikes,
    remainingLikes,
    canLike,
    isLoading: isLoading || subscriptionLoading,
    incrementLikeCount,
    refreshUsage: fetchUsedLikes,
    tier,
    subscribed,
  };
}

function getLimitMessage(tier: SubscriptionTier, maxLikes: number | null): string {
  if (tier === 'basic' && maxLikes !== null) {
    return `You've used all ${maxLikes} likes for today. Upgrade to Premium for unlimited likes or wait until tomorrow.`;
  }
  
  return 'You have reached your daily like limit.';
}
