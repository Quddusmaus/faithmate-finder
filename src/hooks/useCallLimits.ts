import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useSubscription, SubscriptionTier } from '@/hooks/useSubscription';
import { toast } from '@/hooks/use-toast';

interface CallLimits {
  maxCalls: number | null; // null means unlimited
  usedCalls: number;
  remainingCalls: number | null; // null means unlimited
  canMakeCall: boolean;
  isLoading: boolean;
}

// Call limits per tier
const TIER_CALL_LIMITS: Record<string, number | null> = {
  basic: 0, // No calls
  premium: 3, // 3 calls per day
  elite: null, // Unlimited
};

export function useCallLimits() {
  const { tier, subscribed, isLoading: subscriptionLoading } = useSubscription();
  const [usedCalls, setUsedCalls] = useState(0);
  const [isLoading, setIsLoading] = useState(true);

  const maxCalls = subscribed && tier ? TIER_CALL_LIMITS[tier] : 0;
  
  const remainingCalls = maxCalls === null 
    ? null 
    : Math.max(0, maxCalls - usedCalls);
  
  const canMakeCall = maxCalls === null || (maxCalls > 0 && usedCalls < maxCalls);

  const fetchUsedCalls = useCallback(async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setIsLoading(false);
        return;
      }

      const { data, error } = await supabase
        .rpc('get_today_call_count', { p_user_id: user.id });

      if (error) {
        console.error('Error fetching call count:', error);
      } else {
        setUsedCalls(data || 0);
      }
    } catch (error) {
      console.error('Error fetching call count:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const incrementCallCount = useCallback(async (): Promise<boolean> => {
    // Check if user can make a call first
    if (!canMakeCall) {
      toast({
        title: 'Call limit reached',
        description: getTierMessage(tier, maxCalls),
        variant: 'destructive',
      });
      return false;
    }

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast({
          title: 'Authentication required',
          description: 'Please sign in to make calls.',
          variant: 'destructive',
        });
        return false;
      }

      const { data, error } = await supabase
        .rpc('increment_call_count', { p_user_id: user.id });

      if (error) {
        console.error('Error incrementing call count:', error);
        return false;
      }

      setUsedCalls(data || usedCalls + 1);
      return true;
    } catch (error) {
      console.error('Error incrementing call count:', error);
      return false;
    }
  }, [canMakeCall, tier, maxCalls, usedCalls]);

  useEffect(() => {
    if (!subscriptionLoading) {
      fetchUsedCalls();
    }
  }, [subscriptionLoading, fetchUsedCalls]);

  return {
    maxCalls,
    usedCalls,
    remainingCalls,
    canMakeCall,
    isLoading: isLoading || subscriptionLoading,
    incrementCallCount,
    refreshUsage: fetchUsedCalls,
    tier,
    subscribed,
  };
}

function getTierMessage(tier: SubscriptionTier, maxCalls: number | null): string {
  if (!tier) {
    return 'Subscribe to a plan to make video and voice calls.';
  }
  
  if (tier === 'basic') {
    return 'Basic plan does not include calls. Upgrade to Premium or Elite to make calls.';
  }
  
  if (tier === 'premium' && maxCalls !== null) {
    return `You've used all ${maxCalls} calls for today. Upgrade to Elite for unlimited calls or wait until tomorrow.`;
  }
  
  return 'You have reached your daily call limit.';
}
