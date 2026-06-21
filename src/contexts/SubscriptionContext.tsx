import { createContext, useContext, ReactNode } from 'react';

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

// ─────────────────────────────────────────────────────────────────────────────
// Payments are DISABLED. Stripe has been removed (rejected by the payment
// processor); Apple/Google in-app purchases will replace it later. Until then
// every authenticated user gets full premium access with zero payment gating.
//
// This provider reports a static "subscribed: premium" state and never calls any
// payment edge functions (check-subscription / create-checkout / customer-portal),
// so there are no Stripe network calls and no paywall redirects anywhere.
// ─────────────────────────────────────────────────────────────────────────────
const FULL_ACCESS: SubscriptionStatus = {
  subscribed: true,
  tier: 'premium',
  subscriptionEnd: null,
  isLoading: false,
};

const noop = async () => {};

export function SubscriptionProvider({ children }: { children: ReactNode }) {
  return (
    <SubscriptionContext.Provider value={{
      ...FULL_ACCESS,
      checkSubscription: noop,
      createCheckout: noop,
      openCustomerPortal: noop,
    }}>
      {children}
    </SubscriptionContext.Provider>
  );
}

export function useSubscription() {
  const context = useContext(SubscriptionContext);
  if (!context) {
    // Used outside the provider — still grant full access, no payment calls.
    return {
      ...FULL_ACCESS,
      checkSubscription: async () => {},
      createCheckout: async () => {},
      openCustomerPortal: async () => {},
    };
  }
  return context;
}
