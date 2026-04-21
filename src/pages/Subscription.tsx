import { useEffect } from 'react';
import { useSearchParams, useNavigate, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Check, Sparkles, Zap, ArrowLeft, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { toast } from '@/hooks/use-toast';
import { useSubscription, SUBSCRIPTION_TIERS, SubscriptionTier } from '@/hooks/useSubscription';
import { getSessionWithTimeout } from '@/lib/safeAuth';

const tierIcons: Record<string, React.ReactNode> = {
  basic: <Zap className="h-6 w-6" />,
  premium: <Sparkles className="h-6 w-6" />,
};

const tierColors: Record<string, string> = {
  basic: 'border-blue-500/50 bg-blue-500/5',
  premium: 'border-purple-500/50 bg-purple-500/5',
};

const tierBadgeColors: Record<string, string> = {
  basic: 'bg-blue-500',
  premium: 'bg-purple-500',
};

export default function Subscription() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { subscribed, tier, subscriptionEnd, isLoading, createCheckout, openCustomerPortal, checkSubscription } = useSubscription();

  useEffect(() => {
    const success = searchParams.get('success');
    const canceled = searchParams.get('canceled');

    if (success === 'true') {
      toast({
        title: 'Subscription successful!',
        description: 'Thank you for subscribing. Your premium features are now active.',
      });
      checkSubscription();
      navigate('/subscription', { replace: true });
    } else if (canceled === 'true') {
      toast({
        title: 'Subscription canceled',
        description: 'Your subscription was not completed.',
        variant: 'destructive',
      });
      navigate('/subscription', { replace: true });
    }
  }, [searchParams, navigate, checkSubscription]);

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const session = await getSessionWithTimeout(5000);
        if (!session) {
          navigate('/auth', { replace: true });
        }
      } catch {
        navigate('/auth', { replace: true });
      }
    };
    checkAuth();
  }, [navigate]);

  const formatDate = (dateString: string | null) => {
    if (!dateString) return '';
    return new Date(dateString).toLocaleDateString(undefined, {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container max-w-4xl mx-auto px-4 py-8">
        <div className="mb-8">
          <Link to="/profiles" className="inline-flex items-center text-muted-foreground hover:text-foreground transition-colors">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Profiles
          </Link>
        </div>

        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold mb-4">Choose Your Plan</h1>
          <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
            Unlock premium features and find your perfect match faster with our subscription plans.
          </p>
          
          {subscribed && tier && (
            <div className="mt-6 p-4 rounded-lg bg-primary/10 border border-primary/20 inline-block">
              <p className="text-primary font-medium">
                You're currently on the <span className="capitalize font-bold">{tier}</span> plan
                {subscriptionEnd && (
                  <span className="text-muted-foreground ml-2">
                    (renews {formatDate(subscriptionEnd)})
                  </span>
                )}
              </p>
              <Button 
                variant="link" 
                className="mt-2 text-primary"
                onClick={openCustomerPortal}
              >
                Manage Subscription
              </Button>
            </div>
          )}
        </div>

        <div className="grid md:grid-cols-2 gap-8 mb-12">
          {(Object.entries(SUBSCRIPTION_TIERS) as [SubscriptionTier, typeof SUBSCRIPTION_TIERS.basic][]).map(([tierKey, tierData]) => {
            if (!tierKey) return null;
            const isCurrentTier = tier === tierKey;
            const isPremium = tierKey === 'premium';

            return (
              <Card 
                key={tierKey} 
                className={`relative transition-all duration-300 hover:shadow-lg ${
                  tierColors[tierKey as string]
                } ${isCurrentTier ? 'ring-2 ring-primary' : ''} ${isPremium ? 'scale-105' : ''}`}
              >
                {isPremium && (
                  <Badge className={`absolute -top-3 left-1/2 -translate-x-1/2 ${tierBadgeColors[tierKey as string]}`}>
                    Best Value
                  </Badge>
                )}
                {isCurrentTier && (
                  <Badge className="absolute -top-3 right-4 bg-green-500">
                    Your Plan
                  </Badge>
                )}
                
                <CardHeader className="text-center pb-4">
                  <div className={`mx-auto mb-4 p-3 rounded-full ${tierBadgeColors[tierKey as string]} text-white w-fit`}>
                    {tierIcons[tierKey as string]}
                  </div>
                  <CardTitle className="text-2xl">{tierData.name}</CardTitle>
                  <CardDescription>
                    <span className="text-4xl font-bold text-foreground">${tierData.price.toFixed(2)}</span>
                    <span className="text-muted-foreground">/month</span>
                  </CardDescription>
                </CardHeader>
                
                <CardContent className="pb-6">
                  <ul className="space-y-3">
                    {tierData.features.map((feature, index) => (
                      <li key={index} className="flex items-start gap-3">
                        <Check className={`h-5 w-5 mt-0.5 flex-shrink-0 ${
                          tierKey === 'basic' ? 'text-blue-500' : 'text-purple-500'
                        }`} />
                        <span className="text-sm">{feature}</span>
                      </li>
                    ))}
                  </ul>
                </CardContent>
                
                <CardFooter>
                  {isCurrentTier ? (
                    <Button 
                      className="w-full" 
                      variant="outline"
                      onClick={openCustomerPortal}
                    >
                      Manage Plan
                    </Button>
                  ) : subscribed ? (
                    <Button 
                      className="w-full" 
                      variant="outline"
                      onClick={openCustomerPortal}
                    >
                      Switch to {tierData.name}
                    </Button>
                  ) : (
                    <Button 
                      className={`w-full ${
                        tierKey === 'premium' ? 'bg-purple-500 hover:bg-purple-600' :
                        'bg-blue-500 hover:bg-blue-600'
                      }`}
                      onClick={() => createCheckout(tierKey as 'basic' | 'premium')}
                    >
                      Get {tierData.name}
                    </Button>
                  )}
                </CardFooter>
              </Card>
            );
          })}
        </div>

        <div className="text-center text-muted-foreground">
          <p className="text-sm">
            All plans include a 7-day free trial. Cancel anytime. 
            <br />
            Secure payment powered by Stripe.
          </p>
        </div>
      </div>
    </div>
  );
}
