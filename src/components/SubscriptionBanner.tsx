import { Link } from 'react-router-dom';
import { Sparkles, X, Phone, Heart } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useState } from 'react';

interface SubscriptionBannerProps {
  type: 'calls' | 'likes';
}

export function SubscriptionBanner({ type }: SubscriptionBannerProps) {
  const [dismissed, setDismissed] = useState(false);

  if (dismissed) {
    return null;
  }

  const content = type === 'calls' 
    ? {
        icon: Phone,
        title: "You've used your daily call",
        description: "Upgrade to Premium for unlimited video and voice calls!"
      }
    : {
        icon: Heart,
        title: "You've used all 20 likes for today",
        description: "Upgrade to Premium for unlimited likes!"
      };

  const Icon = content.icon;

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
            <Icon className="h-5 w-5" />
          </div>
          <div>
            <h3 className="font-semibold text-lg">{content.title}</h3>
            <p className="text-white/90 text-sm">
              {content.description}
            </p>
          </div>
        </div>
        
        <Link to="/subscription">
          <Button 
            variant="secondary" 
            className="bg-white text-purple-600 hover:bg-white/90 font-semibold whitespace-nowrap"
          >
            <Sparkles className="h-4 w-4 mr-2" />
            Upgrade Now
          </Button>
        </Link>
      </div>
    </div>
  );
}
