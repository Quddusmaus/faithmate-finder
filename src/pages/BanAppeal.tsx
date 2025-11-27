import { useEffect, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Heart, AlertTriangle, Clock, CheckCircle, XCircle, ArrowLeft, Send } from "lucide-react";
import { toast } from "sonner";
import { Skeleton } from "@/components/ui/skeleton";
import { formatDistanceToNow } from "date-fns";

interface Appeal {
  id: string;
  appeal_reason: string;
  status: string;
  admin_response: string | null;
  submitted_at: string;
  reviewed_at: string | null;
}

interface ProfileStatus {
  status: string;
  suspended_until: string | null;
  suspension_reason: string | null;
}

const BanAppeal = () => {
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [appealReason, setAppealReason] = useState("");
  const [existingAppeals, setExistingAppeals] = useState<Appeal[]>([]);
  const [profileStatus, setProfileStatus] = useState<ProfileStatus | null>(null);
  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
    checkUserAndFetchData();
  }, []);

  const checkUserAndFetchData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        navigate("/auth");
        return;
      }

      setUserId(user.id);

      // Fetch profile status - use service role or admin access to get status even if banned
      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("status, suspended_until, suspension_reason")
        .eq("user_id", user.id)
        .maybeSingle();

      if (profileError) {
        console.error("Error fetching profile:", profileError);
      }

      setProfileStatus(profile);

      // Fetch existing appeals
      const { data: appeals, error: appealsError } = await supabase
        .from("ban_appeals")
        .select("*")
        .eq("user_id", user.id)
        .order("submitted_at", { ascending: false });

      if (appealsError) {
        console.error("Error fetching appeals:", appealsError);
      } else {
        setExistingAppeals(appeals || []);
      }
    } catch (error) {
      console.error("Error:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmitAppeal = async () => {
    if (!appealReason.trim()) {
      toast.error("Please provide a reason for your appeal");
      return;
    }

    if (!userId) {
      toast.error("You must be logged in to submit an appeal");
      return;
    }

    // Check if there's already a pending appeal
    const pendingAppeal = existingAppeals.find(a => a.status === "pending");
    if (pendingAppeal) {
      toast.error("You already have a pending appeal. Please wait for it to be reviewed.");
      return;
    }

    try {
      setIsSubmitting(true);

      const { error } = await supabase
        .from("ban_appeals")
        .insert({
          user_id: userId,
          appeal_reason: appealReason.trim(),
        });

      if (error) throw error;

      toast.success("Your appeal has been submitted. We will review it soon.");
      setAppealReason("");
      checkUserAndFetchData();
    } catch (error) {
      console.error("Error submitting appeal:", error);
      toast.error("Failed to submit appeal. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const hasPendingAppeal = existingAppeals.some(a => a.status === "pending");
  const isBannedOrSuspended = profileStatus?.status === "banned" || profileStatus?.status === "suspended";

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-muted to-background">
        <div className="container mx-auto px-6 py-8">
          <Skeleton className="h-8 w-48 mb-8" />
          <Skeleton className="h-64 w-full" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-muted to-background">
      {/* Header */}
      <nav className="border-b border-border bg-background/80 backdrop-blur-sm">
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link to="/" className="flex items-center gap-2">
                <Heart className="h-8 w-8 text-primary" fill="currentColor" />
                <span className="text-2xl font-bold text-foreground">Unity Hearts</span>
              </Link>
            </div>
            <Link to="/">
              <Button variant="ghost" className="gap-2">
                <ArrowLeft className="h-4 w-4" />
                Back to Home
              </Button>
            </Link>
          </div>
        </div>
      </nav>

      <main className="container mx-auto px-6 py-8 max-w-2xl">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-foreground">Appeal Your Account Status</h1>
          <p className="text-muted-foreground">
            If you believe your account was suspended or banned in error, you can submit an appeal.
          </p>
        </div>

        {/* Current Status */}
        {profileStatus && (
          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <AlertTriangle className="h-5 w-5 text-destructive" />
                Your Account Status
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <span className="font-medium">Status:</span>
                  <Badge variant={profileStatus.status === "active" ? "default" : "destructive"}>
                    {profileStatus.status === "active" ? "Active" : 
                     profileStatus.status === "suspended" ? "Suspended" : "Banned"}
                  </Badge>
                </div>
                {profileStatus.status === "suspended" && profileStatus.suspended_until && (
                  <div>
                    <span className="font-medium">Suspended until:</span>{" "}
                    <span className="text-muted-foreground">
                      {new Date(profileStatus.suspended_until).toLocaleDateString('en-US', {
                        weekday: 'long',
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric'
                      })}
                    </span>
                  </div>
                )}
                {profileStatus.suspension_reason && (
                  <div>
                    <span className="font-medium">Reason:</span>{" "}
                    <span className="text-muted-foreground">{profileStatus.suspension_reason}</span>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Appeal Form */}
        {isBannedOrSuspended && !hasPendingAppeal && (
          <Card className="mb-6">
            <CardHeader>
              <CardTitle>Submit an Appeal</CardTitle>
              <CardDescription>
                Explain why you believe your account should be reinstated. Be honest and provide any relevant context.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="appeal-reason">Your Appeal</Label>
                <Textarea
                  id="appeal-reason"
                  placeholder="Explain why you believe your account should be reinstated..."
                  value={appealReason}
                  onChange={(e) => setAppealReason(e.target.value)}
                  rows={6}
                  className="mt-1"
                  maxLength={2000}
                />
                <p className="text-xs text-muted-foreground mt-1">
                  {appealReason.length}/2000 characters
                </p>
              </div>
              <Button 
                onClick={handleSubmitAppeal} 
                disabled={isSubmitting || !appealReason.trim()}
                className="w-full gap-2"
              >
                <Send className="h-4 w-4" />
                {isSubmitting ? "Submitting..." : "Submit Appeal"}
              </Button>
            </CardContent>
          </Card>
        )}

        {hasPendingAppeal && (
          <Card className="mb-6 border-yellow-500/50">
            <CardContent className="pt-6">
              <div className="flex items-center gap-3 text-yellow-600 dark:text-yellow-400">
                <Clock className="h-5 w-5" />
                <span>You have a pending appeal. Please wait for our team to review it.</span>
              </div>
            </CardContent>
          </Card>
        )}

        {!isBannedOrSuspended && (
          <Card className="mb-6 border-green-500/50">
            <CardContent className="pt-6">
              <div className="flex items-center gap-3 text-green-600 dark:text-green-400">
                <CheckCircle className="h-5 w-5" />
                <span>Your account is in good standing. No appeal is necessary.</span>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Previous Appeals */}
        {existingAppeals.length > 0 && (
          <div>
            <h2 className="text-xl font-semibold mb-4">Your Appeal History</h2>
            <div className="space-y-4">
              {existingAppeals.map((appeal) => (
                <Card key={appeal.id}>
                  <CardHeader className="pb-2">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-base">
                        Appeal submitted {formatDistanceToNow(new Date(appeal.submitted_at), { addSuffix: true })}
                      </CardTitle>
                      <Badge 
                        variant={
                          appeal.status === "pending" ? "outline" :
                          appeal.status === "approved" ? "default" : "destructive"
                        }
                        className={appeal.status === "pending" ? "border-yellow-500 text-yellow-600" : ""}
                      >
                        {appeal.status === "pending" && <Clock className="h-3 w-3 mr-1" />}
                        {appeal.status === "approved" && <CheckCircle className="h-3 w-3 mr-1" />}
                        {appeal.status === "rejected" && <XCircle className="h-3 w-3 mr-1" />}
                        {appeal.status}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div>
                      <p className="text-sm font-medium">Your reason:</p>
                      <p className="text-sm text-muted-foreground">{appeal.appeal_reason}</p>
                    </div>
                    {appeal.admin_response && (
                      <div className="p-3 bg-muted rounded-lg">
                        <p className="text-sm font-medium">Admin response:</p>
                        <p className="text-sm text-muted-foreground">{appeal.admin_response}</p>
                      </div>
                    )}
                    {appeal.reviewed_at && (
                      <p className="text-xs text-muted-foreground">
                        Reviewed {formatDistanceToNow(new Date(appeal.reviewed_at), { addSuffix: true })}
                      </p>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

export default BanAppeal;
