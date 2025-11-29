import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Heart, Download, Smartphone, Share, Plus, CheckCircle2, ArrowLeft } from "lucide-react";
import { Link } from "react-router-dom";
import { usePWAInstall } from "@/hooks/usePWAInstall";
import { useToast } from "@/hooks/use-toast";

const Install = () => {
  const { isInstallable, isInstalled, isIOS, promptInstall } = usePWAInstall();
  const { toast } = useToast();

  const handleInstallClick = async () => {
    const success = await promptInstall();
    if (success) {
      toast({
        title: "App installed!",
        description: "Unity Hearts has been added to your home screen.",
      });
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-muted to-background">
      <nav className="container mx-auto px-4 sm:px-6 py-4 sm:py-6">
        <div className="flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2">
            <Heart className="h-6 w-6 sm:h-8 sm:w-8 text-primary" fill="currentColor" />
            <span className="text-xl sm:text-2xl font-bold text-foreground">Unity Hearts</span>
          </Link>
          <Link to="/">
            <Button variant="ghost" size="sm">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back
            </Button>
          </Link>
        </div>
      </nav>

      <main className="container mx-auto px-4 sm:px-6 py-8 sm:py-12">
        <div className="max-w-2xl mx-auto">
          <div className="text-center mb-8 sm:mb-12">
            <div className="inline-flex items-center justify-center w-20 h-20 sm:w-24 sm:h-24 rounded-2xl bg-primary/10 mb-4 sm:mb-6">
              <Smartphone className="w-10 h-10 sm:w-12 sm:h-12 text-primary" />
            </div>
            <h1 className="text-2xl sm:text-4xl font-bold text-foreground mb-3 sm:mb-4">
              Install Unity Hearts
            </h1>
            <p className="text-base sm:text-lg text-muted-foreground px-2">
              Add Unity Hearts to your home screen for quick access and a native app experience
            </p>
          </div>

          {isInstalled ? (
            <Card className="border-green-500/50 bg-green-500/5">
              <CardContent className="pt-6 text-center">
                <CheckCircle2 className="w-16 h-16 text-green-500 mx-auto mb-4" />
                <h2 className="text-xl font-semibold text-foreground mb-2">Already Installed!</h2>
                <p className="text-muted-foreground mb-4">
                  Unity Hearts is already installed on your device. You can find it on your home screen.
                </p>
                <Link to="/profiles">
                  <Button className="bg-primary hover:bg-primary/90">
                    Start Browsing Profiles
                  </Button>
                </Link>
              </CardContent>
            </Card>
          ) : isInstallable ? (
            <Card className="shadow-xl">
              <CardHeader className="text-center">
                <CardTitle className="text-xl sm:text-2xl">Ready to Install</CardTitle>
                <CardDescription>
                  Click the button below to add Unity Hearts to your home screen
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <Button 
                  onClick={handleInstallClick}
                  className="w-full bg-primary hover:bg-primary/90 h-12 text-lg"
                  size="lg"
                >
                  <Download className="mr-2 h-5 w-5" />
                  Install App
                </Button>

                <div className="grid gap-4 pt-4">
                  <h3 className="font-semibold text-foreground">Benefits of installing:</h3>
                  <ul className="space-y-3 text-sm text-muted-foreground">
                    <li className="flex items-start gap-3">
                      <CheckCircle2 className="w-5 h-5 text-primary shrink-0 mt-0.5" />
                      <span>Quick access from your home screen</span>
                    </li>
                    <li className="flex items-start gap-3">
                      <CheckCircle2 className="w-5 h-5 text-primary shrink-0 mt-0.5" />
                      <span>Works offline with cached content</span>
                    </li>
                    <li className="flex items-start gap-3">
                      <CheckCircle2 className="w-5 h-5 text-primary shrink-0 mt-0.5" />
                      <span>Full-screen experience without browser UI</span>
                    </li>
                    <li className="flex items-start gap-3">
                      <CheckCircle2 className="w-5 h-5 text-primary shrink-0 mt-0.5" />
                      <span>Faster load times</span>
                    </li>
                  </ul>
                </div>
              </CardContent>
            </Card>
          ) : isIOS ? (
            <Card className="shadow-xl">
              <CardHeader className="text-center">
                <CardTitle className="text-xl sm:text-2xl">Install on iPhone/iPad</CardTitle>
                <CardDescription>
                  Follow these steps to add Unity Hearts to your home screen
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-4">
                  <div className="flex items-start gap-4 p-4 rounded-lg bg-muted/50">
                    <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary text-primary-foreground font-bold shrink-0">
                      1
                    </div>
                    <div>
                      <p className="font-medium text-foreground mb-1">Tap the Share button</p>
                      <p className="text-sm text-muted-foreground flex items-center gap-2">
                        Look for the <Share className="w-4 h-4" /> icon at the bottom of Safari
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start gap-4 p-4 rounded-lg bg-muted/50">
                    <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary text-primary-foreground font-bold shrink-0">
                      2
                    </div>
                    <div>
                      <p className="font-medium text-foreground mb-1">Tap "Add to Home Screen"</p>
                      <p className="text-sm text-muted-foreground flex items-center gap-2">
                        Scroll down and tap <Plus className="w-4 h-4" /> Add to Home Screen
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start gap-4 p-4 rounded-lg bg-muted/50">
                    <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary text-primary-foreground font-bold shrink-0">
                      3
                    </div>
                    <div>
                      <p className="font-medium text-foreground mb-1">Tap "Add"</p>
                      <p className="text-sm text-muted-foreground">
                        Confirm by tapping Add in the top right corner
                      </p>
                    </div>
                  </div>
                </div>

                <div className="pt-4 border-t border-border">
                  <p className="text-sm text-muted-foreground text-center">
                    Make sure you're using Safari browser for the best experience
                  </p>
                </div>
              </CardContent>
            </Card>
          ) : (
            <Card className="shadow-xl">
              <CardHeader className="text-center">
                <CardTitle className="text-xl sm:text-2xl">Install on Android</CardTitle>
                <CardDescription>
                  Follow these steps to add Unity Hearts to your home screen
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-4">
                  <div className="flex items-start gap-4 p-4 rounded-lg bg-muted/50">
                    <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary text-primary-foreground font-bold shrink-0">
                      1
                    </div>
                    <div>
                      <p className="font-medium text-foreground mb-1">Open browser menu</p>
                      <p className="text-sm text-muted-foreground">
                        Tap the three dots (⋮) in the top right corner of Chrome
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start gap-4 p-4 rounded-lg bg-muted/50">
                    <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary text-primary-foreground font-bold shrink-0">
                      2
                    </div>
                    <div>
                      <p className="font-medium text-foreground mb-1">Tap "Add to Home screen"</p>
                      <p className="text-sm text-muted-foreground">
                        Or "Install app" if you see that option
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start gap-4 p-4 rounded-lg bg-muted/50">
                    <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary text-primary-foreground font-bold shrink-0">
                      3
                    </div>
                    <div>
                      <p className="font-medium text-foreground mb-1">Confirm installation</p>
                      <p className="text-sm text-muted-foreground">
                        Tap "Add" or "Install" to confirm
                      </p>
                    </div>
                  </div>
                </div>

                <div className="pt-4 border-t border-border">
                  <p className="text-sm text-muted-foreground text-center">
                    Use Chrome or Edge browser for the best experience
                  </p>
                </div>
              </CardContent>
            </Card>
          )}

          <div className="mt-8 text-center">
            <Link to="/profiles">
              <Button variant="link" className="text-primary">
                Skip for now and browse profiles
              </Button>
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
};

export default Install;
