import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { PhotoUpload } from "@/components/PhotoUpload";
import { InterestsSelector } from "@/components/InterestsSelector";
import { NotificationPreferences } from "@/components/NotificationPreferences";
import { Loader2, BadgeCheck, Clock, ShieldCheck, Pause, Play, Heart, Users, MessageCircle, Shield, LogOut, Menu } from "lucide-react";
import { useAdminStatus } from "@/hooks/useAdminStatus";
import { NotificationBell } from "@/components/NotificationBell";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import type { User } from "@supabase/supabase-js";

const ProfileSetup = () => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(false);
  const [verificationLoading, setVerificationLoading] = useState(false);
  const [existingProfile, setExistingProfile] = useState<any>(null);
  const [verificationStatus, setVerificationStatus] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [age, setAge] = useState("");
  const [gender, setGender] = useState("");
  const [location, setLocation] = useState("");
  const [lookingFor, setLookingFor] = useState("");
  const [bio, setBio] = useState("");
  const [photoUrls, setPhotoUrls] = useState<string[]>([]);
  const [interests, setInterests] = useState<string[]>([]);
  const [isVisible, setIsVisible] = useState(true);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
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
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      navigate("/auth");
      return;
    }
    setUser(user);
    
    // Check if profile exists
    const { data: profile } = await supabase
      .from("profiles")
      .select("*")
      .eq("user_id", user.id)
      .maybeSingle();

    if (profile) {
      setExistingProfile(profile);
      setName(profile.name || "");
      setAge(profile.age?.toString() || "");
      setGender(profile.gender || "");
      setLocation(profile.location || "");
      setLookingFor(profile.looking_for || "");
      setBio(profile.bio || "");
      setPhotoUrls(profile.photo_urls || []);
      setInterests(profile.interests || []);
      setIsVisible(profile.is_visible ?? true);
      
      // Check verification status
      if (profile.verified) {
        setVerificationStatus("verified");
      } else {
        const { data: verificationRequest } = await supabase
          .from("verification_requests")
          .select("status")
          .eq("user_id", user.id)
          .order("submitted_at", { ascending: false })
          .limit(1)
          .maybeSingle();
        
        if (verificationRequest) {
          setVerificationStatus(verificationRequest.status);
        }
      }
    } else {
      // Set name from signup if available
      setName(user.user_metadata?.name || "");
    }
  };

  const handleRequestVerification = async () => {
    if (!user) return;
    
    setVerificationLoading(true);
    try {
      const { error } = await supabase
        .from("verification_requests")
        .insert({
          user_id: user.id,
          status: "pending",
        });

      if (error) {
        if (error.code === "23505") {
          toast({
            title: "Already Requested",
            description: "You already have a pending verification request.",
            variant: "destructive",
          });
        } else {
          throw error;
        }
      } else {
        setVerificationStatus("pending");
        toast({
          title: "Verification Requested",
          description: "Your verification request has been submitted for review.",
        });
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to submit verification request.",
        variant: "destructive",
      });
    } finally {
      setVerificationLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    setLoading(true);

    try {
      const profileData = {
        user_id: user.id,
        name,
        age: age ? parseInt(age) : null,
        gender: gender || null,
        location: location || null,
        looking_for: lookingFor || null,
        bio: bio || null,
        photo_urls: photoUrls,
        interests,
        is_visible: isVisible,
      };

      if (existingProfile) {
        const { error } = await supabase
          .from("profiles")
          .update(profileData)
          .eq("id", existingProfile.id);

        if (error) throw error;

        toast({
          title: "Profile Updated",
          description: "Your profile has been updated successfully.",
        });
      } else {
        const { error } = await supabase
          .from("profiles")
          .insert([profileData]);

        if (error) throw error;

        toast({
          title: "Profile Created",
          description: "Your profile has been created successfully.",
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
        <Card className="shadow-2xl">
          <CardHeader className="px-4 sm:px-6">
            <CardTitle className="text-2xl sm:text-3xl">
              {existingProfile ? "Edit Your Profile" : "Complete Your Profile"}
            </CardTitle>
            <CardDescription>
              {existingProfile 
                ? "Update your information to keep your profile current" 
                : "Tell us about yourself to start connecting"}
            </CardDescription>
          </CardHeader>
          <CardContent className="px-4 sm:px-6">
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="name">Full Name *</Label>
                <Input
                  id="name"
                  type="text"
                  placeholder="Enter your full name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                  maxLength={100}
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="age">Age</Label>
                  <Input
                    id="age"
                    type="number"
                    placeholder="25"
                    value={age}
                    onChange={(e) => setAge(e.target.value)}
                    min="18"
                    max="120"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="gender">Gender</Label>
                  <Select value={gender} onValueChange={setGender}>
                    <SelectTrigger id="gender">
                      <SelectValue placeholder="Select gender" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="male">Male</SelectItem>
                      <SelectItem value="female">Female</SelectItem>
                      <SelectItem value="non-binary">Non-binary</SelectItem>
                      <SelectItem value="prefer-not-to-say">Prefer not to say</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="location">Location</Label>
                <Input
                  id="location"
                  type="text"
                  placeholder="City, Country"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  maxLength={100}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="lookingFor">Looking For</Label>
                <Select value={lookingFor} onValueChange={setLookingFor}>
                  <SelectTrigger id="lookingFor">
                    <SelectValue placeholder="What are you looking for?" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="friendship">Friendship</SelectItem>
                    <SelectItem value="dating">Dating</SelectItem>
                    <SelectItem value="marriage">Marriage</SelectItem>
                    <SelectItem value="networking">Networking</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="bio">About Me</Label>
                <Textarea
                  id="bio"
                  placeholder="Tell us about yourself, your interests, and what you're looking for..."
                  value={bio}
                  onChange={(e) => setBio(e.target.value)}
                  rows={5}
                  maxLength={1000}
                />
                <p className="text-xs text-muted-foreground">{bio.length}/1000 characters</p>
              </div>

              <div className="space-y-2">
                <Label>Profile Photos</Label>
                <PhotoUpload 
                  userId={user.id} 
                  existingPhotos={photoUrls}
                  onPhotosChange={setPhotoUrls}
                />
              </div>

              <InterestsSelector
                selectedInterests={interests}
                onInterestsChange={setInterests}
              />

              {/* Pause Account Section */}
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
                      onCheckedChange={(checked) => setIsVisible(!checked)}
                      aria-label="Pause account"
                    />
                  </div>
                </CardContent>
              </Card>

              {/* Verification Section */}
              {existingProfile && (
                <Card className="border-primary/20 bg-primary/5">
                  <CardContent className="pt-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <ShieldCheck className="h-5 w-5 text-primary" />
                        <div>
                          <p className="font-medium">Profile Verification</p>
                          <p className="text-sm text-muted-foreground">
                            Get a verified badge on your profile
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
                          Pending Review
                        </Badge>
                      ) : verificationStatus === "rejected" ? (
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={handleRequestVerification}
                          disabled={verificationLoading}
                        >
                          {verificationLoading ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            "Request Again"
                          )}
                        </Button>
                      ) : (
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={handleRequestVerification}
                          disabled={verificationLoading}
                        >
                          {verificationLoading ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            "Request Verification"
                          )}
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Email Notification Preferences */}
              {existingProfile && (
                <NotificationPreferences userId={user.id} />
              )}

              <div className="flex gap-3">
                <Button
                  type="submit"
                  className="flex-1 bg-primary hover:bg-primary/90"
                  disabled={loading}
                >
                  {loading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    existingProfile ? "Update Profile" : "Create Profile"
                  )}
                </Button>
                {existingProfile && (
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => navigate("/profiles")}
                  >
                    Cancel
                  </Button>
                )}
              </div>
            </form>
          </CardContent>
        </Card>
        </div>
      </div>
    </div>
  );
};

export default ProfileSetup;