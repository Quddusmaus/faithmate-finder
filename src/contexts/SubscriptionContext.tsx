import { createContext, useContext, useState, useEffect, useCallback, useRef, ReactNode } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { getSessionWithTimeout, withTimeout } from '@/lib/safeAuth';

export type SubscriptionTier = 'basic' | 'premium' | null;

export interface SubscriptionStatus {
  subscribed: boolean;
  tier: SubscriptionTier;
  subscriptionEnd: string | null;
  isLoading: boolean;
}

interface SubscriptionContextType extends SubscriptionStatus {
  checkSubscription: () => Promise<void>;
  createCheckout: (tier: 'basic' | 'premium') => Promise<void>;
  openCustomerPortal: () => Promise<void>;
}

const SubscriptionContext = createContext<SubscriptionContextType | null>(null);

export const SUBSCRIPTION_TIERS = {
  basic: {
    name: 'Basic',
    price: 10.00,
    features: [
      '20 likes per day',
      'Unlimited messaging',
      '1 video/voice call per day',
      'Basic profile visibility',
      'Standard support',
    ],
  },
  premium: {
    name: 'Premium',
    price: 15.99,
    features: [
      'Unlimited likes',
      'Unlimited messaging',
      'Unlimited video/voice calls',
      'See who likes you',
      'Boosted profile visibility',
      'Priority support',
    ],
  },
};

export function SubscriptionProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<SubscriptionStatus>({
    subscribed: false,
    tier: null,
    subscriptionEnd: null,
    isLoading: true,
  });
  const lastCheckedAtRef = useRef(0);

  const checkSubscription = useCallback(async (force = false) => {
    const now = Date.now();
    if (!force && now - lastCheckedAtRef.current < 30000) return;
    lastCheckedAtRef.current = now;

    try {
      const session = await getSessionWithTimeout(3000);

      if (!session) {
        setStatus({
          subscribed: false,
          tier: null,
          subscriptionEnd: null,
          isLoading: false,
        });
        return;
      }

      // Add a safety timeout so we never get stuck on "Checking subscription..."
      const { data, error } = await withTimeout(
        supabase.functions.invoke('check-subscription', {
          headers: {
            Authorization: `Bearer ${session.access_token}`,
          },
        }),
        10000,
        'Subscription check timeout',
      ) as any;

      if (error) {
        console.error('Error checking subscription:', error);
        // Don't crash - just set default values
        setStatus(prev => ({ ...prev, isLoading: false }));
        return;
      }

      setStatus({
        subscribed: data?.subscribed ?? false,
        tier: data?.tier ?? null,
        subscriptionEnd: data?.subscription_end ?? null,
        isLoading: false,
      });
    } catch (error) {
      console.error('Error checking subscription:', error);
      setStatus(prev => ({ ...prev, isLoading: false }));
    }
  }, []);

  const createCheckout = useCallback(async (tier: 'basic' | 'premium') => {
    try {
      const session = await getSessionWithTimeout(3000);
      
      if (!session) {
        toast({
          title: 'Authentication required',
          description: 'Please sign in to subscribe.',
          variant: 'destructive',
        });
        return;
      }

      const { data, error } = await supabase.functions.invoke('create-checkout', {
        body: { tier },
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });

      if (error) {
        throw error;
      }

      if (data.url) {
        // Redirect in same tab to avoid popup blockers
        window.location.href = data.url;
      }
    } catch (error) {
      console.error('Error creating checkout:', error);
      toast({
        title: 'Error',
        description: 'Failed to create checkout session. Please try again.',
        variant: 'destructive',
      });
    }
  }, []);

  const openCustomerPortal = useCallback(async () => {
    try {
      const session = await getSessionWithTimeout(3000);
      
      if (!session) {
        toast({
          title: 'Authentication required',
          description: 'Please sign in to manage your subscription.',
          variant: 'destructive',
        });
        return;
      }

      const { data, error } = await supabase.functions.invoke('customer-portal', {
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });

      if (error) {
        throw error;
      }

      if (data.url) {
        window.open(data.url, '_blank');
      }
    } catch (error) {
      console.error('Error opening customer portal:', error);
      toast({
        title: 'Error',
        description: 'Failed to open subscription management. Please try again.',
        variant: 'destructive',
      });
    }
  }, []);

  useEffect(() => {
    checkSubscription(true);

    // Refresh subscription status every 60 seconds
    const interval = setInterval(() => checkSubscription(), 60000);

    // Also refresh on auth state change
    const { data: { subscription } } = supabase.auth.onAuthStateChange(() => {
      checkSubscription(true);
    });

    return () => {
      clearInterval(interval);
      subscription.unsubscribe();
    };
  }, [checkSubscription]);

  return (
    <SubscriptionContext.Provider value={{
      ...status,
      checkSubscription,
      createCheckout,
      openCustomerPortal,
    }}>
      {children}
    </SubscriptionContext.Provider>
  );
}

export function useSubscription() {
  const context = useContext(SubscriptionContext);
  if (!context) {
    // Return default values when used outside provider (for backward compatibility)
    return {
      subscribed: false,
      tier: null as SubscriptionTier,
      subscriptionEnd: null,
      isLoading: true,
      checkSubscription: async () => {},
      createCheckout: async () => {},
      openCustomerPortal: async () => {},
    };
  }
  return context;
}
