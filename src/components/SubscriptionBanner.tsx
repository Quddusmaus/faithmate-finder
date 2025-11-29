import { Link } from 'react-router-dom';
import { Sparkles, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useSubscription } from '@/hooks/useSubscription';
import { useState } from 'react';

export function SubscriptionBanner() {
  const { subscribed, isLoading } = useSubscription();
  const [dismissed, setDismissed] = useState(false);

  // Don't show if loading, already subscribed, or dismissed
  if (isLoading || subscribed || dismissed) {
    return null;
  }

  return (
    <div className="relative bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-lg p-4 mb-6 shadow-lg">
      <button
        onClick={() => setDismissed(true)}
        className="absolute top-2 right-2 p-1 hover:bg-white/20 rounded-full transition-colors"
        aria-label="Dismiss"
      >
        <X className="h-4 w-4" />
      </button>
      
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pr-6">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-white/20 rounded-full">
            <Sparkles className="h-5 w-5" />
          </div>
          <div>
            <h3 className="font-semibold text-lg">Upgrade to Premium</h3>
            <p className="text-white/90 text-sm">
              Get unlimited likes, see who likes you, and more!
            </p>
          </div>
        </div>
        
        <Link to="/subscription">
          <Button 
            variant="secondary" 
            className="bg-white text-purple-600 hover:bg-white/90 font-semibold whitespace-nowrap"
          >
            View Plans
          </Button>
        </Link>
      </div>
    </div>
  );
}
