import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { ProfileSetupWizard } from "@/components/ProfileSetupWizard";
import { NotificationPreferences } from "@/components/NotificationPreferences";
import { Loader2, BadgeCheck, Clock, ShieldCheck, Pause, Play, Heart, Users, MessageCircle, Shield, LogOut, Menu, Camera, Settings } from "lucide-react";
import { PhotoVerification } from "@/components/PhotoVerification";
import { GDPRTools } from "@/components/GDPRTools";
import LanguageSwitcher from "@/components/LanguageSwitcher";
import { useAdminStatus } from "@/hooks/useAdminStatus";
import { NotificationBell } from "@/components/NotificationBell";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { getUserWithTimeout, withTimeout } from "@/lib/safeAuth";
import type { User } from "@supabase/supabase-js";

const ProfileSetup = () => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(false);
  const [verificationStatus, setVerificationStatus] = useState<string | null>(null);
  const [showPhotoVerification, setShowPhotoVerification] = useState(false);
  const [existingProfile, setExistingProfile] = useState<any>(null);
  const [isVisible, setIsVisible] = useState(true);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [activeTab, setActiveTab] = useState("profile");
  
  const [profileData, setProfileData] = useState({
    name: "",
    age: "",
    gender: "",
    location: "",
    lookingFor: "",
    bio: "",
    photoUrls: [] as string[],
    interests: [] as string[],
  });

  const navigate = useNavigate();
  const { toast } = useToast();
  const { isAdmin } = useAdminStatus();

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    navigate("/");
  };

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    try {
      const currentUser = await getUserWithTimeout(5000);
      if (!currentUser) {
        navigate("/auth", { replace: true });
        return;
      }
      setUser(currentUser);
      
      const { data: profile } = await withTimeout(
        supabase
          .from("profiles")
          .select("*")
          .eq("user_id", currentUser.id)
          .maybeSingle(),
        8000,
        "Profile load timed out",
      );

      if (profile) {
        setExistingProfile(profile);
        setProfileData({
          name: profile.name || "",
          age: profile.age?.toString() || "",
          gender: profile.gender || "",
          location: profile.location || "",
          lookingFor: profile.looking_for || "",
          bio: profile.bio || "",
          photoUrls: profile.photo_urls || [],
          interests: profile.interests || [],
        });
        setIsVisible(profile.is_visible ?? true);
        
        if (profile.verified) {
          setVerificationStatus("verified");
        } else {
          const { data: photoVerification } = await withTimeout(
            supabase
              .from("photo_verifications")
              .select("status")
              .eq("user_id", currentUser.id)
              .order("created_at", { ascending: false })
              .limit(1)
              .maybeSingle(),
            8000,
            "Verification status load timed out",
          );
          
          if (photoVerification) {
            setVerificationStatus(photoVerification.status);
          }
        }
      } else {
        setProfileData((prev) => ({
          ...prev,
          name: currentUser.user_metadata?.name || "",
        }));
      }
    } catch (error) {
      console.error("Profile setup auth/profile load failed:", error);
      toast({
        title: "Error",
        description: "We couldn't load your profile right now. Please try again.",
        variant: "destructive",
      });
      navigate("/auth", { replace: true });
    }
  };

  const handleSubmit = async (data: typeof profileData) => {
    if (!user) return;

    setLoading(true);

    try {
      const dbData = {
        user_id: user.id,
        name: data.name,
        age: data.age ? parseInt(data.age) : null,
        gender: data.gender || null,
        location: data.location || null,
        looking_for: data.lookingFor || null,
        bio: data.bio || null,
        photo_urls: data.photoUrls,
        interests: data.interests,
        is_visible: isVisible,
      };

      if (existingProfile) {
        const { error } = await supabase
          .from("profiles")
          .update(dbData)
          .eq("id", existingProfile.id);

        if (error) throw error;

        toast({
          title: "Profile Updated",
          description: "Your profile has been updated successfully.",
        });
      } else {
        const { error } = await supabase
          .from("profiles")
          .insert([dbData]);

        if (error) throw error;

        // Welcome email is sent automatically by a database trigger on profile insert.

        toast({
          title: "Profile Created",
          description: "Welcome! Your profile is now live.",
        });
      }

      navigate("/profiles");
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to save profile.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleVisibilityChange = async (paused: boolean) => {
    setIsVisible(!paused);
    
    if (existingProfile) {
      const { error } = await supabase
        .from("profiles")
        .update({ is_visible: !paused })
        .eq("id", existingProfile.id);

      if (error) {
        toast({
          title: "Error",
          description: "Failed to update visibility.",
          variant: "destructive",
        });
        setIsVisible(paused);
      } else {
        toast({
          title: paused ? "Account Paused" : "Account Active",
          description: paused 
            ? "You're now hidden from matching" 
            : "You're visible and can be matched",
        });
      }
    }
  };

  if (!user) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-muted to-background">
      {/* Navigation */}
      <nav className="border-b bg-background/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="container mx-auto px-4 py-3 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2 text-xl sm:text-2xl font-bold text-primary">
            <Heart className="h-6 w-6 sm:h-7 sm:w-7" />
            <span className="hidden xs:inline">Unity Hearts</span>
          </Link>
          
          {/* Desktop Navigation */}
          <div className="hidden sm:flex items-center gap-2">
            <NotificationBell />
            <Button variant="ghost" size="sm" asChild>
              <Link to="/profiles">
                <Users className="h-4 w-4 mr-1" />
                Profiles
              </Link>
            </Button>
            <Button variant="ghost" size="sm" asChild>
              <Link to="/messages">
                <MessageCircle className="h-4 w-4 mr-1" />
                Messages
              </Link>
            </Button>
            {isAdmin && (
              <Button variant="ghost" size="sm" asChild>
                <Link to="/admin">
                  <Shield className="h-4 w-4 mr-1" />
                  Admin
                </Link>
              </Button>
            )}
            <Button variant="ghost" size="sm" onClick={handleSignOut}>
              <LogOut className="h-4 w-4 mr-1" />
              Sign Out
            </Button>
          </div>

          {/* Mobile Navigation */}
          <div className="flex sm:hidden items-center gap-2">
            <NotificationBell />
            <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon">
                  <Menu className="h-5 w-5" />
                </Button>
              </SheetTrigger>
              <SheetContent side="right" className="w-[250px]">
                <div className="flex flex-col gap-3 mt-8">
                  <Link to="/profiles" onClick={() => setMobileMenuOpen(false)}>
                    <Button variant="ghost" className="w-full justify-start">
                      <Users className="mr-2 h-4 w-4" />
                      Profiles
                    </Button>
                  </Link>
                  <Link to="/messages" onClick={() => setMobileMenuOpen(false)}>
                    <Button variant="ghost" className="w-full justify-start">
                      <MessageCircle className="mr-2 h-4 w-4" />
                      Messages
                    </Button>
                  </Link>
                  {isAdmin && (
                    <Link to="/admin" onClick={() => setMobileMenuOpen(false)}>
                      <Button variant="ghost" className="w-full justify-start">
                        <Shield className="mr-2 h-4 w-4" />
                        Admin
                      </Button>
                    </Link>
                  )}
                  <Button variant="ghost" className="w-full justify-start" onClick={() => { handleSignOut(); setMobileMenuOpen(false); }}>
                    <LogOut className="mr-2 h-4 w-4" />
                    Sign Out
                  </Button>
                </div>
              </SheetContent>
            </Sheet>
          </div>
        </div>
      </nav>

      <div className="p-4 sm:p-6">
        <div className="mx-auto max-w-2xl py-6 sm:py-12">
          {/* Page Header */}
          <div className="text-center mb-8">
            <h1 className="text-3xl sm:text-4xl font-bold mb-2">
              {existingProfile ? "Your Profile" : "Welcome! Let's set up your profile"}
            </h1>
            <p className="text-muted-foreground">
              {existingProfile 
                ? "Keep your profile updated to attract the right connections"
                : "Complete your profile to start meeting amazing people"}
            </p>
          </div>

          {existingProfile ? (
            <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="profile" className="gap-2">
                  <Heart className="h-4 w-4" />
                  Profile
                </TabsTrigger>
                <TabsTrigger value="settings" className="gap-2">
                  <Settings className="h-4 w-4" />
                  Settings
                </TabsTrigger>
              </TabsList>

              <TabsContent value="profile" className="space-y-6">
                <ProfileSetupWizard
                  userId={user.id}
                  initialData={profileData}
                  isEditing={true}
                  loading={loading}
                  onSubmit={handleSubmit}
                  onCancel={() => navigate("/profiles")}
                />
              </TabsContent>

              <TabsContent value="settings" className="space-y-4">
                {/* Account Status */}
                <Card className={isVisible ? "border-muted" : "border-yellow-500/50 bg-yellow-500/5"}>
                  <CardContent className="pt-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        {isVisible ? (
                          <Play className="h-5 w-5 text-green-500" />
                        ) : (
                          <Pause className="h-5 w-5 text-yellow-500" />
                        )}
                        <div>
                          <p className="font-medium">
                            {isVisible ? "Account Active" : "Account Paused"}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            {isVisible 
                              ? "You're visible and can be matched with others" 
                              : "You're hidden from matching - existing conversations remain"}
                          </p>
                        </div>
                      </div>
                      <Switch
                        checked={!isVisible}
                        onCheckedChange={handleVisibilityChange}
                        aria-label="Pause account"
                      />
                    </div>
                  </CardContent>
                </Card>

                {/* Verification Section */}
                {!showPhotoVerification && (
                  <Card className="border-primary/20 bg-primary/5">
                    <CardContent className="pt-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <ShieldCheck className="h-5 w-5 text-primary" />
                          <div>
                            <p className="font-medium">Profile Verification</p>
                            <p className="text-sm text-muted-foreground">
                              Verify with a selfie matching a random pose
                            </p>
                          </div>
                        </div>
                        {verificationStatus === "verified" ? (
                          <Badge className="gap-1 bg-green-500">
                            <BadgeCheck className="h-3 w-3" />
                            Verified
                          </Badge>
                        ) : verificationStatus === "pending" ? (
                          <Badge variant="outline" className="gap-1 border-yellow-500 text-yellow-600">
                            <Clock className="h-3 w-3" />
                            Processing...
                          </Badge>
                        ) : verificationStatus === "rejected" || verificationStatus === "failed" ? (
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => setShowPhotoVerification(true)}
                          >
                            <Camera className="h-4 w-4 mr-1" />
                            Try Again
                          </Button>
                        ) : (
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => setShowPhotoVerification(true)}
                          >
                            <Camera className="h-4 w-4 mr-1" />
                            Verify Now
                          </Button>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* Photo Verification Flow */}
                {showPhotoVerification && (
                  <PhotoVerification
                    userId={user.id}
                    onVerified={() => {
                      setShowPhotoVerification(false);
                      setVerificationStatus("verified");
                    }}
                    onCancel={() => setShowPhotoVerification(false)}
                  />
                )}

                {/* Language Preference */}
                <Card className="border-muted">
                  <CardContent className="pt-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium">Language</p>
                        <p className="text-sm text-muted-foreground">
                          Choose your preferred display language
                        </p>
                      </div>
                      <LanguageSwitcher />
                    </div>
                  </CardContent>
                </Card>

                {/* Email Notification Preferences */}
                <NotificationPreferences userId={user.id} />

                {/* GDPR Data & Privacy Tools */}
                {user.email && (
                  <GDPRTools userId={user.id} userEmail={user.email} />
                )}
              </TabsContent>
            </Tabs>
          ) : (
            <ProfileSetupWizard
              userId={user.id}
              initialData={profileData}
              isEditing={false}
              loading={loading}
              onSubmit={handleSubmit}
            />
          )}
        </div>
      </div>
    </div>
  );
};

export default ProfileSetup;
