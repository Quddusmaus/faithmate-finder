import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { X, Download, Share, Plus } from "lucide-react";
import { usePWAInstall } from "@/hooks/usePWAInstall";
import { useToast } from "@/hooks/use-toast";
import { Link } from "react-router-dom";

const InstallPromptBanner = () => {
  const { isInstallable, isInstalled, isIOS, promptInstall } = usePWAInstall();
  const { toast } = useToast();
  const [isDismissed, setIsDismissed] = useState(false);
  const [isMobileDevice, setIsMobileDevice] = useState(false);

  useEffect(() => {
    // Check if mobile using user agent (more reliable for PWA detection)
    const checkMobile = () => {
      const userAgent = navigator.userAgent.toLowerCase();
      const isMobile = /android|webos|iphone|ipad|ipod|blackberry|iemobile|opera mini|mobile/i.test(userAgent);
      console.log("PWA Banner Debug:", { userAgent, isMobile, isIOS, isInstallable, isInstalled });
      setIsMobileDevice(isMobile);
    };
    
    checkMobile();
    
    const dismissed = localStorage.getItem("pwa-banner-dismissed");
    if (dismissed) {
      const dismissedTime = parseInt(dismissed, 10);
      // Show banner again after 7 days
      if (Date.now() - dismissedTime < 7 * 24 * 60 * 60 * 1000) {
        setIsDismissed(true);
      }
    }
  }, [isIOS, isInstallable, isInstalled]);

  const handleDismiss = () => {
    setIsDismissed(true);
    localStorage.setItem("pwa-banner-dismissed", Date.now().toString());
  };

  const handleInstallClick = async () => {
    const success = await promptInstall();
    if (success) {
      toast({
        title: "App installed!",
        description: "Unity Hearts has been added to your home screen.",
      });
    }
  };

  // Debug: log all conditions
  console.log("PWA Banner Conditions:", { isInstalled, isDismissed, isMobileDevice, isInstallable, isIOS });

  // Don't show if already installed or dismissed
  if (isInstalled || isDismissed) {
    console.log("PWA Banner hidden: installed or dismissed");
    return null;
  }

  // TEMPORARILY: Always show banner on any device for debugging
  // Show on mobile devices, or when installable, or on iOS
  const shouldShow = true; // isMobileDevice || isInstallable || isIOS;
  if (!shouldShow) {
    console.log("PWA Banner hidden: shouldShow is false");
    return null;
  }

  // Determine if this is Android (not iOS and on mobile)
  const isAndroid = isMobileDevice && !isIOS;

  return (
    <div className="fixed left-0 right-0 z-[9999] p-3 sm:p-4 bg-primary backdrop-blur-sm border-t border-primary-foreground/10 shadow-lg animate-in slide-in-from-bottom duration-300" style={{ bottom: 'max(env(safe-area-inset-bottom, 0px), 20px)' }}>
      <div className="container mx-auto flex items-center justify-between gap-3 sm:gap-4">
        <div className="flex items-center gap-3 flex-1 min-w-0">
          <div className="hidden sm:flex items-center justify-center w-10 h-10 rounded-lg bg-primary-foreground/20 shrink-0">
            <Download className="w-5 h-5 text-primary-foreground" />
          </div>
          <div className="min-w-0">
            <p className="font-semibold text-primary-foreground text-sm sm:text-base truncate">
              Install Unity Hearts
            </p>
            {isIOS ? (
              <p className="text-xs sm:text-sm text-primary-foreground/80 flex items-center gap-1 flex-wrap">
                Tap <Share className="w-3 h-3 inline" /> then <Plus className="w-3 h-3 inline" /> Add to Home Screen
              </p>
            ) : (
              <p className="text-xs sm:text-sm text-primary-foreground/80">
                Add to your home screen for quick access
              </p>
            )}
          </div>
        </div>
        
        <div className="flex items-center gap-2 shrink-0">
          {isInstallable ? (
            <Button
              onClick={handleInstallClick}
              size="sm"
              variant="secondary"
              className="bg-primary-foreground text-primary hover:bg-primary-foreground/90 font-medium"
            >
              <Download className="w-4 h-4 mr-1 sm:mr-2" />
              <span className="hidden sm:inline">Install</span>
              <span className="sm:hidden">Get</span>
            </Button>
          ) : (
            <Link to="/install">
              <Button
                size="sm"
                variant="secondary"
                className="bg-primary-foreground text-primary hover:bg-primary-foreground/90 font-medium"
              >
                {isIOS ? "How to" : "Install"}
              </Button>
            </Link>
          )}
          
          <Button
            onClick={handleDismiss}
            size="icon"
            variant="ghost"
            className="h-8 w-8 text-primary-foreground/80 hover:text-primary-foreground hover:bg-primary-foreground/10"
            aria-label="Dismiss"
          >
            <X className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </div>
  );
};

export default InstallPromptBanner;
