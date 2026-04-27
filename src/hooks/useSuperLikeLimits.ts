import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useSubscription, SubscriptionTier } from '@/contexts/SubscriptionContext';
import { toast } from '@/hooks/use-toast';
import { getUserWithTimeout, withTimeout } from '@/lib/safeAuth';

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
  const [usedSuperLikes, setUsedSuperLikes] = useState(0);
  const [isLoading, setIsLoading] = useState(true);

  // Only subscribers get super likes
  const maxSuperLikes = subscribed && tier ? TIER_SUPER_LIKE_LIMITS[tier] : 0;
  
  const remainingSuperLikes = maxSuperLikes === null 
    ? null 
    : Math.max(0, maxSuperLikes - usedSuperLikes);
  
  const canSuperLike = subscribed && (maxSuperLikes === null || usedSuperLikes < maxSuperLikes);

  const fetchUsedSuperLikes = useCallback(async () => {
    try {
      const user = await getUserWithTimeout(5000);
      if (!user) {
        setIsLoading(false);
        return;
      }

      const { data, error } = await withTimeout<any>(
        supabase.rpc('get_today_super_like_count' as any, { p_user_id: user.id }) as any,
        5000,
        'Super Like count request timed out',
      );

      if (error) {
        console.error('Error fetching super like count:', error);
      } else {
        setUsedSuperLikes(data || 0);
      }
    } catch (error) {
      console.error('Error fetching super like count:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

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
  }, [canSuperLike, tier, maxSuperLikes, usedSuperLikes]);

  useEffect(() => {
    if (!subscriptionLoading) {
      fetchUsedSuperLikes();
    }
  }, [subscriptionLoading, fetchUsedSuperLikes]);

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
