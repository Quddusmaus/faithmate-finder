import { useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useSubscription, SubscriptionTier } from '@/contexts/SubscriptionContext';
import { toast } from '@/hooks/use-toast';
import { getUserWithTimeout, withTimeout } from '@/lib/safeAuth';
import { useDailyCount } from '@/hooks/useDailyCount';

interface SuperLikeLimits {
  maxSuperLikes: number | null;
  usedSuperLikes: number;
  remainingSuperLikes: number | null;
  canSuperLike: boolean;
  isLoading: boolean;
}

// Super like limits per tier - Basic gets 1/day, Premium gets 5/day
const TIER_SUPER_LIKE_LIMITS: Record<string, number | null> = {
  basic: 1,
  premium: 5,
};

export function useSuperLikeLimits() {
  const { tier, subscribed, isLoading: subscriptionLoading } = useSubscription();

  // Only subscribers get super likes
  const maxSuperLikes = subscribed && tier ? TIER_SUPER_LIKE_LIMITS[tier] : 0;

  // Shared across every ProfileCard (one request per page, not per card).
  const {
    count: usedSuperLikes,
    isLoading,
    setCount: setUsedSuperLikes,
    refresh: fetchUsedSuperLikes,
  } = useDailyCount(
    'get_today_super_like_count',
    !subscriptionLoading && maxSuperLikes !== null && maxSuperLikes > 0,
  );

  const remainingSuperLikes = maxSuperLikes === null 
    ? null 
    : Math.max(0, maxSuperLikes - usedSuperLikes);
  
  const canSuperLike = subscribed && (maxSuperLikes === null || usedSuperLikes < maxSuperLikes);

  const incrementSuperLikeCount = useCallback(async (): Promise<boolean> => {
    if (!canSuperLike) {
      toast({
        title: 'Super Like limit reached',
        description: getSuperLikeLimitMessage(tier, maxSuperLikes),
        variant: 'destructive',
      });
      return false;
    }

    try {
      const user = await getUserWithTimeout(5000);
      if (!user) {
        return false;
      }

      const { data, error } = await withTimeout<any>(
        supabase.rpc('increment_super_like_count' as any, { p_user_id: user.id }) as any,
        5000,
        'Increment Super Like request timed out',
      );

      if (error) {
        console.error('Error incrementing super like count:', error);
        return false;
      }

      setUsedSuperLikes(data || usedSuperLikes + 1);
      return true;
    } catch (error) {
      console.error('Error incrementing super like count:', error);
      return false;
    }
  }, [canSuperLike, tier, maxSuperLikes, usedSuperLikes, setUsedSuperLikes]);

  return {
    maxSuperLikes,
    usedSuperLikes,
    remainingSuperLikes,
    canSuperLike,
    isLoading: isLoading || subscriptionLoading,
    incrementSuperLikeCount,
    refreshUsage: fetchUsedSuperLikes,
    tier,
    subscribed,
  };
}

function getSuperLikeLimitMessage(tier: SubscriptionTier, maxSuperLikes: number | null): string {
  if (tier === 'basic' && maxSuperLikes !== null) {
    return `You've used your ${maxSuperLikes} Super Like for today. Upgrade to Premium for 5 Super Likes daily!`;
  }
  if (tier === 'premium' && maxSuperLikes !== null) {
    return `You've used all ${maxSuperLikes} Super Likes for today. Come back tomorrow!`;
  }
  return 'Super Likes are a premium feature. Subscribe to start sending Super Likes!';
}
