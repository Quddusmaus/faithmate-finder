import { useEffect } from 'react';
import { Helmet } from 'react-helmet-async';
import { useNavigate, Link } from 'react-router-dom';
import { Sparkles, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { getSessionWithTimeout } from '@/lib/safeAuth';

// Payments are disabled. Stripe has been removed and Apple/Google in-app
// purchases will replace it later. This page no longer triggers any checkout —
// it just confirms that every signed-in member already has full access. The
// route is kept so existing links to /subscription don't 404.
export default function Subscription() {
  const navigate = useNavigate();

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

  return (
    <div className="min-h-screen bg-background">
      <Helmet>
        <title>Membership — Uniting Hearts</title>
        <meta name="description" content="Uniting Hearts is free to use — every member has full access to browsing, messaging, and matchmaking features for the Baháʼí community." />
        <link rel="canonical" href="https://unityhearts.app/subscription" />
        <meta property="og:title" content="Membership — Uniting Hearts" />
        <meta property="og:description" content="Full access for every Uniting Hearts member." />
        <meta property="og:url" content="https://unityhearts.app/subscription" />
      </Helmet>
      <div className="container max-w-2xl mx-auto px-4 py-8">
        <div className="mb-8">
          <Link to="/profiles" className="inline-flex items-center text-muted-foreground hover:text-foreground transition-colors">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Profiles
          </Link>
        </div>

        <div className="text-center py-12">
          <div className="mx-auto mb-6 p-4 rounded-full bg-primary/10 text-primary w-fit">
            <Sparkles className="h-8 w-8" />
          </div>
          <h1 className="text-4xl font-bold mb-4">You have full access</h1>
          <p className="text-muted-foreground text-lg max-w-xl mx-auto mb-8">
            Every Uniting Hearts member currently enjoys full access — unlimited
            likes, messaging, and calls. There's nothing to purchase.
          </p>
          <Link to="/profiles">
            <Button size="lg" className="bg-primary hover:bg-primary/90">
              Start Browsing
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
