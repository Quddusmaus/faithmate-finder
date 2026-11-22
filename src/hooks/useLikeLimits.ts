import { useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useSubscription, SubscriptionTier } from '@/contexts/SubscriptionContext';
import { toast } from '@/hooks/use-toast';
import { getUserWithTimeout, withTimeout } from '@/lib/safeAuth';
import { useDailyCount } from '@/hooks/useDailyCount';

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

  const maxLikes = subscribed && tier ? TIER_LIKE_LIMITS[tier] : null; // Non-subscribers get unlimited (free tier)

  // Shared across every ProfileCard (one request per page, not per card).
  // Unlimited likes (everyone, while payments are removed) need no count at all.
  const {
    count: usedLikes,
    isLoading,
    setCount: setUsedLikes,
    refresh: fetchUsedLikes,
  } = useDailyCount('get_today_like_count', !subscriptionLoading && maxLikes !== null);

  const remainingLikes = maxLikes === null 
    ? null 
    : Math.max(0, maxLikes - usedLikes);
  
  const canLike = maxLikes === null || usedLikes < maxLikes;

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
      const user = await getUserWithTimeout(5000);
      if (!user) {
        return false;
      }

      const { data, error } = await withTimeout(
        supabase.rpc('increment_like_count', { p_user_id: user.id }),
        5000,
        'Increment like request timed out',
      );

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
