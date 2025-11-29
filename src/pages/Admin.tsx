import { useEffect, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAdminStatus } from "@/hooks/useAdminStatus";
import { VerificationRequestCard } from "@/components/VerificationRequestCard";
import { AdminAnalytics } from "@/components/AdminAnalytics";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Heart, Shield, Users, CheckCircle, XCircle, Clock, ArrowLeft, Flag, AlertTriangle, Ban, Scale, LayoutDashboard, Bug } from "lucide-react";
import { AdminErrorLogs } from "@/components/AdminErrorLogs";
import { toast } from "sonner";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { formatDistanceToNow } from "date-fns";

interface Profile {
  id: string;
  user_id: string;
  name: string;
  age: number | null;
  location: string | null;
  photo_urls: string[] | null;
  bio: string | null;
  status?: string;
  suspended_until?: string | null;
  suspension_reason?: string | null;
}

interface VerificationRequest {
  id: string;
  user_id: string;
  status: string;
  submitted_at: string;
  reviewed_at: string | null;
  rejection_reason: string | null;
  profile?: Profile;
}

interface ProfileReport {
  id: string;
  reporter_id: string;
  reported_profile_id: string;
  reason: string;
  details: string | null;
  status: string;
  created_at: string;
  reviewed_at: string | null;
  resolution_notes: string | null;
  reported_profile?: Profile;
}

interface BanAppeal {
  id: string;
  user_id: string;
  appeal_reason: string;
  status: string;
  admin_response: string | null;
  submitted_at: string;
  reviewed_at: string | null;
  profile?: Profile;
}

const REASON_LABELS: Record<string, string> = {
  fake_profile: "Fake or misleading profile",
  inappropriate_content: "Inappropriate photos or content",
  harassment: "Harassment or abusive behavior",
  spam: "Spam or scam",
  underage: "User appears to be underage",
  other: "Other",
};

const Admin = () => {
  const navigate = useNavigate();
  const { isAdmin, isLoading: isAdminLoading } = useAdminStatus();
  const [requests, setRequests] = useState<VerificationRequest[]>([]);
  const [reports, setReports] = useState<ProfileReport[]>([]);
  const [appeals, setAppeals] = useState<BanAppeal[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);
  const [activeTab, setActiveTab] = useState("pending");
  const [activeSection, setActiveSection] = useState<"dashboard" | "verifications" | "reports" | "appeals" | "errors">("dashboard");
  const [selectedReport, setSelectedReport] = useState<ProfileReport | null>(null);
  const [selectedAppeal, setSelectedAppeal] = useState<BanAppeal | null>(null);
  const [resolutionNotes, setResolutionNotes] = useState("");
  const [appealResponse, setAppealResponse] = useState("");
  const [actionType, setActionType] = useState<"none" | "suspend" | "ban">("none");
  const [suspensionDuration, setSuspensionDuration] = useState<string>("7");

  useEffect(() => {
    if (!isAdminLoading && !isAdmin) {
      toast.error("Access denied. Admin privileges required.");
      navigate("/");
    }
  }, [isAdmin, isAdminLoading, navigate]);

  useEffect(() => {
    if (isAdmin) {
      fetchVerificationRequests();
      fetchReports();
      fetchAppeals();
    }
  }, [isAdmin]);

  const fetchVerificationRequests = async () => {
    try {
      setIsLoading(true);
      
      const { data: requestsData, error: requestsError } = await supabase
        .from("verification_requests")
        .select("*")
        .order("submitted_at", { ascending: false });

      if (requestsError) throw requestsError;

      const requestsWithProfiles: VerificationRequest[] = [];
      
      for (const request of requestsData || []) {
        const { data: profileData } = await supabase
          .from("profiles")
          .select("id, user_id, name, age, location, photo_urls, bio, status, suspended_until, suspension_reason")
          .eq("user_id", request.user_id)
          .maybeSingle();

        requestsWithProfiles.push({
          ...request,
          profile: profileData || undefined,
        });
      }

      setRequests(requestsWithProfiles);
    } catch (error) {
      console.error("Error fetching verification requests:", error);
      toast.error("Failed to load verification requests");
    } finally {
      setIsLoading(false);
    }
  };

  const fetchReports = async () => {
    try {
      const { data: reportsData, error: reportsError } = await supabase
        .from("profile_reports")
        .select("*")
        .order("created_at", { ascending: false });

      if (reportsError) throw reportsError;

      const reportsWithProfiles: ProfileReport[] = [];
      
      for (const report of reportsData || []) {
        const { data: profileData } = await supabase
          .from("profiles")
          .select("id, user_id, name, age, location, photo_urls, bio, status, suspended_until, suspension_reason")
          .eq("id", report.reported_profile_id)
          .maybeSingle();

        reportsWithProfiles.push({
          ...report,
          reported_profile: profileData || undefined,
        });
      }

      setReports(reportsWithProfiles);
    } catch (error) {
      console.error("Error fetching reports:", error);
      toast.error("Failed to load reports");
    }
  };

  const fetchAppeals = async () => {
    try {
      const { data: appealsData, error: appealsError } = await supabase
        .from("ban_appeals")
        .select("*")
        .order("submitted_at", { ascending: false });

      if (appealsError) throw appealsError;

      const appealsWithProfiles: BanAppeal[] = [];
      
      for (const appeal of appealsData || []) {
        const { data: profileData } = await supabase
          .from("profiles")
          .select("id, user_id, name, age, location, photo_urls, bio, status, suspended_until, suspension_reason")
          .eq("user_id", appeal.user_id)
          .maybeSingle();

        appealsWithProfiles.push({
          ...appeal,
          profile: profileData || undefined,
        });
      }

      setAppeals(appealsWithProfiles);
    } catch (error) {
      console.error("Error fetching appeals:", error);
      toast.error("Failed to load appeals");
    }
  };

  const handleApprove = async (requestId: string) => {
    try {
      setIsProcessing(true);
      
      const request = requests.find((r) => r.id === requestId);
      if (!request) return;

      const { data: { user } } = await supabase.auth.getUser();
      
      const { error: requestError } = await supabase
        .from("verification_requests")
        .update({
          status: "approved",
          reviewed_at: new Date().toISOString(),
          reviewed_by: user?.id,
        })
        .eq("id", requestId);

      if (requestError) throw requestError;

      const { error: profileError } = await supabase
        .from("profiles")
        .update({ verified: true })
        .eq("user_id", request.user_id);

      if (profileError) throw profileError;

      toast.success("Verification request approved");
      fetchVerificationRequests();
    } catch (error) {
      console.error("Error approving request:", error);
      toast.error("Failed to approve verification request");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleReject = async (requestId: string, reason: string) => {
    try {
      setIsProcessing(true);
      
      const { data: { user } } = await supabase.auth.getUser();

      const { error } = await supabase
        .from("verification_requests")
        .update({
          status: "rejected",
          reviewed_at: new Date().toISOString(),
          reviewed_by: user?.id,
          rejection_reason: reason,
        })
        .eq("id", requestId);

      if (error) throw error;

      toast.success("Verification request rejected");
      fetchVerificationRequests();
    } catch (error) {
      console.error("Error rejecting request:", error);
      toast.error("Failed to reject verification request");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleReportAction = async (reportId: string, action: "resolved" | "dismissed") => {
    try {
      setIsProcessing(true);
      
      const { data: { user } } = await supabase.auth.getUser();

      // If taking action and a profile action is selected, update the profile
      if (action === "resolved" && actionType !== "none" && selectedReport?.reported_profile) {
        let suspendedUntil: string | null = null;
        let profileStatus = "active";

        if (actionType === "suspend") {
          const days = parseInt(suspensionDuration);
          const suspendDate = new Date();
          suspendDate.setDate(suspendDate.getDate() + days);
          suspendedUntil = suspendDate.toISOString();
          profileStatus = "suspended";
        } else if (actionType === "ban") {
          profileStatus = "banned";
        }

        const reasonText = resolutionNotes || `Account ${actionType === "ban" ? "banned" : "suspended"} due to report`;

        const { error: profileError } = await supabase
          .from("profiles")
          .update({
            status: profileStatus,
            suspended_until: suspendedUntil,
            suspension_reason: reasonText,
          })
          .eq("id", selectedReport.reported_profile.id);

        if (profileError) throw profileError;

        // Send email notification to the user
        try {
          const { error: emailError } = await supabase.functions.invoke("send-suspension-email", {
            body: {
              user_id: selectedReport.reported_profile.user_id,
              action_type: actionType,
              reason: reasonText,
              suspended_until: suspendedUntil,
            },
          });

          if (emailError) {
            console.error("Error sending suspension email:", emailError);
            // Don't throw - we still want to complete the action even if email fails
          }
        } catch (emailErr) {
          console.error("Failed to send suspension email:", emailErr);
        }
      }

      const { error } = await supabase
        .from("profile_reports")
        .update({
          status: action,
          reviewed_at: new Date().toISOString(),
          reviewed_by: user?.id,
          resolution_notes: resolutionNotes || null,
        })
        .eq("id", reportId);

      if (error) throw error;

      const actionMessage = action === "dismissed" 
        ? "Report dismissed" 
        : actionType === "ban" 
          ? "Profile banned and user notified" 
          : actionType === "suspend" 
            ? `Profile suspended for ${suspensionDuration} days and user notified`
            : "Report resolved";

      toast.success(actionMessage);
      setSelectedReport(null);
      setResolutionNotes("");
      setActionType("none");
      setSuspensionDuration("7");
      fetchReports();
    } catch (error) {
      console.error("Error updating report:", error);
      toast.error("Failed to update report");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleUnbanProfile = async (profile: Profile) => {
    try {
      setIsProcessing(true);
      
      const { error } = await supabase
        .from("profiles")
        .update({
          status: "active",
          suspended_until: null,
          suspension_reason: null,
        })
        .eq("id", profile.id);

      if (error) throw error;

      toast.success(`${profile.name}'s profile has been reactivated`);
      fetchReports();
      fetchAppeals();
    } catch (error) {
      console.error("Error unbanning profile:", error);
      toast.error("Failed to unban profile");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleAppealAction = async (appealId: string, action: "approved" | "rejected") => {
    try {
      setIsProcessing(true);
      
      const { data: { user } } = await supabase.auth.getUser();
      const appeal = appeals.find(a => a.id === appealId);

      if (!appeal) return;

      // Update appeal status
      const { error: appealError } = await supabase
        .from("ban_appeals")
        .update({
          status: action,
          admin_response: appealResponse || null,
          reviewed_at: new Date().toISOString(),
          reviewed_by: user?.id,
        })
        .eq("id", appealId);

      if (appealError) throw appealError;

      // If approved, reactivate the profile
      if (action === "approved" && appeal.profile) {
        const { error: profileError } = await supabase
          .from("profiles")
          .update({
            status: "active",
            suspended_until: null,
            suspension_reason: null,
          })
          .eq("user_id", appeal.user_id);

        if (profileError) throw profileError;
      }

      toast.success(action === "approved" ? "Appeal approved - profile reactivated" : "Appeal rejected");
      setSelectedAppeal(null);
      setAppealResponse("");
      fetchAppeals();
      fetchReports();
    } catch (error) {
      console.error("Error processing appeal:", error);
      toast.error("Failed to process appeal");
    } finally {
      setIsProcessing(false);
    }
  };

  const filteredRequests = requests.filter((r) => r.status === activeTab);
  const filteredReports = reports.filter((r) => r.status === activeTab);
  const filteredAppeals = appeals.filter((a) => a.status === activeTab);

  const verificationStats = {
    pending: requests.filter((r) => r.status === "pending").length,
    approved: requests.filter((r) => r.status === "approved").length,
    rejected: requests.filter((r) => r.status === "rejected").length,
  };

  const reportStats = {
    pending: reports.filter((r) => r.status === "pending").length,
    resolved: reports.filter((r) => r.status === "resolved").length,
    dismissed: reports.filter((r) => r.status === "dismissed").length,
  };

  const appealStats = {
    pending: appeals.filter((a) => a.status === "pending").length,
    approved: appeals.filter((a) => a.status === "approved").length,
    rejected: appeals.filter((a) => a.status === "rejected").length,
  };

  if (isAdminLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-muted to-background">
        <div className="container mx-auto px-6 py-8">
          <Skeleton className="h-8 w-48 mb-8" />
          <div className="grid gap-6 md:grid-cols-3 mb-8">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-24" />
            ))}
          </div>
          <Skeleton className="h-96" />
        </div>
      </div>
    );
  }

  if (!isAdmin) {
    return null;
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
              <Badge variant="secondary" className="gap-1">
                <Shield className="h-3 w-3" />
                Admin Panel
              </Badge>
            </div>
            <Link to="/">
              <Button variant="ghost" className="gap-2">
                <ArrowLeft className="h-4 w-4" />
                Back to Site
              </Button>
            </Link>
          </div>
        </div>
      </nav>

      <main className="container mx-auto px-6 py-8">
        {/* Section Tabs */}
        <div className="flex flex-wrap gap-4 mb-8">
          <Button
            variant={activeSection === "dashboard" ? "default" : "outline"}
            onClick={() => setActiveSection("dashboard")}
            className="gap-2"
          >
            <LayoutDashboard className="h-4 w-4" />
            Dashboard
          </Button>
          <Button
            variant={activeSection === "verifications" ? "default" : "outline"}
            onClick={() => {
              setActiveSection("verifications");
              setActiveTab("pending");
            }}
            className="gap-2"
          >
            <CheckCircle className="h-4 w-4" />
            Verifications
            {verificationStats.pending > 0 && (
              <Badge variant="secondary" className="ml-1">
                {verificationStats.pending}
              </Badge>
            )}
          </Button>
          <Button
            variant={activeSection === "reports" ? "default" : "outline"}
            onClick={() => {
              setActiveSection("reports");
              setActiveTab("pending");
            }}
            className="gap-2"
          >
            <Flag className="h-4 w-4" />
            Reports
            {reportStats.pending > 0 && (
              <Badge variant="destructive" className="ml-1">
                {reportStats.pending}
              </Badge>
            )}
          </Button>
          <Button
            variant={activeSection === "appeals" ? "default" : "outline"}
            onClick={() => {
              setActiveSection("appeals");
              setActiveTab("pending");
            }}
            className="gap-2"
          >
            <Scale className="h-4 w-4" />
            Appeals
            {appealStats.pending > 0 && (
              <Badge variant="outline" className="ml-1 border-purple-500 text-purple-600">
                {appealStats.pending}
              </Badge>
            )}
          </Button>
          <Button
            variant={activeSection === "errors" ? "default" : "outline"}
            onClick={() => setActiveSection("errors")}
            className="gap-2"
          >
            <Bug className="h-4 w-4" />
            Error Logs
          </Button>
        </div>

        {activeSection === "dashboard" ? (
          <>
            <div className="mb-8">
              <h1 className="text-3xl font-bold text-foreground">Admin Dashboard</h1>
              <p className="text-muted-foreground">Overview of platform statistics and activity</p>
            </div>
            <AdminAnalytics />
          </>
        ) : activeSection === "verifications" ? (
          <>
            <div className="mb-8">
              <h1 className="text-3xl font-bold text-foreground">Verification Requests</h1>
              <p className="text-muted-foreground">Review and manage profile verification requests</p>
            </div>

            {/* Stats Cards */}
            <div className="grid gap-6 md:grid-cols-3 mb-8">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium">Pending</CardTitle>
                  <Clock className="h-4 w-4 text-yellow-500" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{verificationStats.pending}</div>
                  <p className="text-xs text-muted-foreground">Awaiting review</p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium">Approved</CardTitle>
                  <CheckCircle className="h-4 w-4 text-green-500" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{verificationStats.approved}</div>
                  <p className="text-xs text-muted-foreground">Verified profiles</p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium">Rejected</CardTitle>
                  <XCircle className="h-4 w-4 text-red-500" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{verificationStats.rejected}</div>
                  <p className="text-xs text-muted-foreground">Declined requests</p>
                </CardContent>
              </Card>
            </div>

            {/* Requests Tabs */}
            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
              <TabsList className="grid w-full grid-cols-3 mb-6">
                <TabsTrigger value="pending" className="gap-2">
                  <Clock className="h-4 w-4" />
                  Pending ({verificationStats.pending})
                </TabsTrigger>
                <TabsTrigger value="approved" className="gap-2">
                  <CheckCircle className="h-4 w-4" />
                  Approved ({verificationStats.approved})
                </TabsTrigger>
                <TabsTrigger value="rejected" className="gap-2">
                  <XCircle className="h-4 w-4" />
                  Rejected ({verificationStats.rejected})
                </TabsTrigger>
              </TabsList>

              {isLoading ? (
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                  {[1, 2, 3].map((i) => (
                    <Skeleton key={i} className="h-48" />
                  ))}
                </div>
              ) : (
                <>
                  <TabsContent value="pending">
                    {filteredRequests.length === 0 ? (
                      <Card className="p-12 text-center">
                        <Users className="mx-auto h-12 w-12 text-muted-foreground/50 mb-4" />
                        <h3 className="text-lg font-medium">No pending requests</h3>
                        <p className="text-muted-foreground">All verification requests have been reviewed.</p>
                      </Card>
                    ) : (
                      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                        {filteredRequests.map((request) => (
                          <VerificationRequestCard
                            key={request.id}
                            request={request}
                            onApprove={handleApprove}
                            onReject={handleReject}
                            isProcessing={isProcessing}
                          />
                        ))}
                      </div>
                    )}
                  </TabsContent>

                  <TabsContent value="approved">
                    {filteredRequests.length === 0 ? (
                      <Card className="p-12 text-center">
                        <CheckCircle className="mx-auto h-12 w-12 text-muted-foreground/50 mb-4" />
                        <h3 className="text-lg font-medium">No approved requests</h3>
                        <p className="text-muted-foreground">No verification requests have been approved yet.</p>
                      </Card>
                    ) : (
                      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                        {filteredRequests.map((request) => (
                          <VerificationRequestCard
                            key={request.id}
                            request={request}
                            onApprove={handleApprove}
                            onReject={handleReject}
                            isProcessing={isProcessing}
                          />
                        ))}
                      </div>
                    )}
                  </TabsContent>

                  <TabsContent value="rejected">
                    {filteredRequests.length === 0 ? (
                      <Card className="p-12 text-center">
                        <XCircle className="mx-auto h-12 w-12 text-muted-foreground/50 mb-4" />
                        <h3 className="text-lg font-medium">No rejected requests</h3>
                        <p className="text-muted-foreground">No verification requests have been rejected.</p>
                      </Card>
                    ) : (
                      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                        {filteredRequests.map((request) => (
                          <VerificationRequestCard
                            key={request.id}
                            request={request}
                            onApprove={handleApprove}
                            onReject={handleReject}
                            isProcessing={isProcessing}
                          />
                        ))}
                      </div>
                    )}
                  </TabsContent>
                </>
              )}
            </Tabs>
          </>
        ) : activeSection === "reports" ? (
          <>
            <div className="mb-8">
              <h1 className="text-3xl font-bold text-foreground">Profile Reports</h1>
              <p className="text-muted-foreground">Review and manage user-submitted profile reports</p>
            </div>

            {/* Report Stats */}
            <div className="grid gap-6 md:grid-cols-3 mb-8">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium">Pending</CardTitle>
                  <AlertTriangle className="h-4 w-4 text-yellow-500" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{reportStats.pending}</div>
                  <p className="text-xs text-muted-foreground">Needs review</p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium">Resolved</CardTitle>
                  <CheckCircle className="h-4 w-4 text-green-500" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{reportStats.resolved}</div>
                  <p className="text-xs text-muted-foreground">Action taken</p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium">Dismissed</CardTitle>
                  <XCircle className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{reportStats.dismissed}</div>
                  <p className="text-xs text-muted-foreground">No action needed</p>
                </CardContent>
              </Card>
            </div>

            {/* Reports Tabs */}
            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
              <TabsList className="grid w-full grid-cols-3 mb-6">
                <TabsTrigger value="pending" className="gap-2">
                  <AlertTriangle className="h-4 w-4" />
                  Pending ({reportStats.pending})
                </TabsTrigger>
                <TabsTrigger value="resolved" className="gap-2">
                  <CheckCircle className="h-4 w-4" />
                  Resolved ({reportStats.resolved})
                </TabsTrigger>
                <TabsTrigger value="dismissed" className="gap-2">
                  <XCircle className="h-4 w-4" />
                  Dismissed ({reportStats.dismissed})
                </TabsTrigger>
              </TabsList>

              {isLoading ? (
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                  {[1, 2, 3].map((i) => (
                    <Skeleton key={i} className="h-48" />
                  ))}
                </div>
              ) : (
                <>
                  {["pending", "resolved", "dismissed"].map((status) => (
                    <TabsContent key={status} value={status}>
                      {filteredReports.length === 0 ? (
                        <Card className="p-12 text-center">
                          <Flag className="mx-auto h-12 w-12 text-muted-foreground/50 mb-4" />
                          <h3 className="text-lg font-medium">No {status} reports</h3>
                          <p className="text-muted-foreground">
                            {status === "pending" 
                              ? "All reports have been reviewed." 
                              : `No reports have been ${status} yet.`}
                          </p>
                        </Card>
                      ) : (
                        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                          {filteredReports.map((report) => (
                            <Card key={report.id} className="overflow-hidden">
                              <CardHeader className="pb-2">
                                <div className="flex items-start justify-between">
                                  <div className="flex items-center gap-3">
                                    {report.reported_profile?.photo_urls?.[0] ? (
                                      <img
                                        src={report.reported_profile.photo_urls[0]}
                                        alt={report.reported_profile.name}
                                        className="h-12 w-12 rounded-full object-cover"
                                      />
                                    ) : (
                                      <div className="h-12 w-12 rounded-full bg-muted flex items-center justify-center">
                                        <Users className="h-6 w-6 text-muted-foreground" />
                                      </div>
                                    )}
                                    <div>
                                      <div className="flex items-center gap-2">
                                        <CardTitle className="text-base">
                                          {report.reported_profile?.name || "Unknown"}
                                        </CardTitle>
                                        {report.reported_profile?.status && report.reported_profile.status !== "active" && (
                                          <Badge variant="destructive" className="text-xs gap-1">
                                            <Ban className="h-3 w-3" />
                                            {report.reported_profile.status === "banned" ? "Banned" : "Suspended"}
                                          </Badge>
                                        )}
                                      </div>
                                      <p className="text-xs text-muted-foreground">
                                        {formatDistanceToNow(new Date(report.created_at), { addSuffix: true })}
                                      </p>
                                    </div>
                                  </div>
                                  <Badge 
                                    variant={
                                      report.status === "pending" ? "outline" :
                                      report.status === "resolved" ? "default" : "secondary"
                                    }
                                    className={
                                      report.status === "pending" ? "border-yellow-500 text-yellow-600" : ""
                                    }
                                  >
                                    {report.status}
                                  </Badge>
                                </div>
                              </CardHeader>
                              <CardContent>
                                <div className="space-y-2">
                                  <div>
                                    <p className="text-sm font-medium">Reason</p>
                                    <p className="text-sm text-muted-foreground">
                                      {REASON_LABELS[report.reason] || report.reason}
                                    </p>
                                  </div>
                                  {report.details && (
                                    <div>
                                      <p className="text-sm font-medium">Details</p>
                                      <p className="text-sm text-muted-foreground line-clamp-2">
                                        {report.details}
                                      </p>
                                    </div>
                                  )}
                                  {report.status === "pending" ? (
                                    <Button
                                      className="w-full mt-4"
                                      onClick={() => setSelectedReport(report)}
                                    >
                                      Review Report
                                    </Button>
                                  ) : report.reported_profile?.status && report.reported_profile.status !== "active" && (
                                    <Button
                                      variant="outline"
                                      className="w-full mt-4"
                                      onClick={() => setSelectedReport(report)}
                                    >
                                      Manage Profile Status
                                    </Button>
                                  )}
                                  {report.resolution_notes && (
                                    <div className="mt-2 p-2 bg-muted rounded text-xs">
                                      <span className="font-medium">Notes: </span>
                                      {report.resolution_notes}
                                    </div>
                                  )}
                                </div>
                              </CardContent>
                            </Card>
                          ))}
                        </div>
                      )}
                    </TabsContent>
                  ))}
                </>
              )}
            </Tabs>
          </>
        ) : activeSection === "appeals" ? (
          <>
            <div className="mb-8">
              <h1 className="text-3xl font-bold text-foreground">Ban Appeals</h1>
              <p className="text-muted-foreground">Review appeals from users whose accounts have been suspended or banned</p>
            </div>

            {/* Appeal Stats */}
            <div className="grid gap-6 md:grid-cols-3 mb-8">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium">Pending</CardTitle>
                  <Clock className="h-4 w-4 text-purple-500" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{appealStats.pending}</div>
                  <p className="text-xs text-muted-foreground">Awaiting review</p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium">Approved</CardTitle>
                  <CheckCircle className="h-4 w-4 text-green-500" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{appealStats.approved}</div>
                  <p className="text-xs text-muted-foreground">Profiles reinstated</p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium">Rejected</CardTitle>
                  <XCircle className="h-4 w-4 text-red-500" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{appealStats.rejected}</div>
                  <p className="text-xs text-muted-foreground">Appeals denied</p>
                </CardContent>
              </Card>
            </div>

            {/* Appeals Tabs */}
            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
              <TabsList className="grid w-full grid-cols-3 mb-6">
                <TabsTrigger value="pending" className="gap-2">
                  <Clock className="h-4 w-4" />
                  Pending ({appealStats.pending})
                </TabsTrigger>
                <TabsTrigger value="approved" className="gap-2">
                  <CheckCircle className="h-4 w-4" />
                  Approved ({appealStats.approved})
                </TabsTrigger>
                <TabsTrigger value="rejected" className="gap-2">
                  <XCircle className="h-4 w-4" />
                  Rejected ({appealStats.rejected})
                </TabsTrigger>
              </TabsList>

              {isLoading ? (
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                  {[1, 2, 3].map((i) => (
                    <Skeleton key={i} className="h-48" />
                  ))}
                </div>
              ) : (
                <>
                  {["pending", "approved", "rejected"].map((status) => (
                    <TabsContent key={status} value={status}>
                      {filteredAppeals.length === 0 ? (
                        <Card className="p-12 text-center">
                          <Scale className="mx-auto h-12 w-12 text-muted-foreground/50 mb-4" />
                          <h3 className="text-lg font-medium">No {status} appeals</h3>
                          <p className="text-muted-foreground">
                            {status === "pending" 
                              ? "All appeals have been reviewed." 
                              : `No appeals have been ${status} yet.`}
                          </p>
                        </Card>
                      ) : (
                        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                          {filteredAppeals.map((appeal) => (
                            <Card key={appeal.id} className="overflow-hidden">
                              <CardHeader className="pb-2">
                                <div className="flex items-start justify-between">
                                  <div className="flex items-center gap-3">
                                    {appeal.profile?.photo_urls?.[0] ? (
                                      <img
                                        src={appeal.profile.photo_urls[0]}
                                        alt={appeal.profile.name}
                                        className="h-12 w-12 rounded-full object-cover"
                                      />
                                    ) : (
                                      <div className="h-12 w-12 rounded-full bg-muted flex items-center justify-center">
                                        <Users className="h-6 w-6 text-muted-foreground" />
                                      </div>
                                    )}
                                    <div>
                                      <div className="flex items-center gap-2">
                                        <CardTitle className="text-base">
                                          {appeal.profile?.name || "Unknown"}
                                        </CardTitle>
                                        {appeal.profile?.status && appeal.profile.status !== "active" && (
                                          <Badge variant="destructive" className="text-xs">
                                            {appeal.profile.status === "banned" ? "Banned" : "Suspended"}
                                          </Badge>
                                        )}
                                      </div>
                                      <p className="text-xs text-muted-foreground">
                                        {formatDistanceToNow(new Date(appeal.submitted_at), { addSuffix: true })}
                                      </p>
                                    </div>
                                  </div>
                                  <Badge 
                                    variant={
                                      appeal.status === "pending" ? "outline" :
                                      appeal.status === "approved" ? "default" : "destructive"
                                    }
                                    className={
                                      appeal.status === "pending" ? "border-purple-500 text-purple-600" : ""
                                    }
                                  >
                                    {appeal.status}
                                  </Badge>
                                </div>
                              </CardHeader>
                              <CardContent>
                                <div className="space-y-2">
                                  <div>
                                    <p className="text-sm font-medium">Appeal Reason</p>
                                    <p className="text-sm text-muted-foreground line-clamp-3">
                                      {appeal.appeal_reason}
                                    </p>
                                  </div>
                                  {appeal.status === "pending" && (
                                    <Button
                                      className="w-full mt-4"
                                      onClick={() => setSelectedAppeal(appeal)}
                                    >
                                      Review Appeal
                                    </Button>
                                  )}
                                  {appeal.admin_response && (
                                    <div className="mt-2 p-2 bg-muted rounded text-xs">
                                      <span className="font-medium">Response: </span>
                                      {appeal.admin_response}
                                    </div>
                                  )}
                                </div>
                              </CardContent>
                            </Card>
                          ))}
                        </div>
                      )}
                    </TabsContent>
                  ))}
                </>
              )}
            </Tabs>
          </>
        ) : activeSection === "errors" ? (
          <>
            <div className="mb-8">
              <h1 className="text-3xl font-bold text-foreground">Error Logs</h1>
              <p className="text-muted-foreground">Monitor and manage application errors</p>
            </div>
            <AdminErrorLogs />
          </>
        ) : null}
      </main>

      {/* Report Review Dialog */}
      <Dialog open={!!selectedReport} onOpenChange={(open) => {
        if (!open) {
          setSelectedReport(null);
          setResolutionNotes("");
          setActionType("none");
          setSuspensionDuration("7");
        }
      }}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Flag className="h-5 w-5 text-destructive" />
              Review Report
            </DialogTitle>
            <DialogDescription>
              Review this report and take appropriate action.
            </DialogDescription>
          </DialogHeader>

          {selectedReport && (
            <div className="space-y-4">
              <div className="flex items-center gap-3 p-3 bg-muted rounded-lg">
                {selectedReport.reported_profile?.photo_urls?.[0] ? (
                  <img
                    src={selectedReport.reported_profile.photo_urls[0]}
                    alt={selectedReport.reported_profile.name}
                    className="h-16 w-16 rounded-full object-cover"
                  />
                ) : (
                  <div className="h-16 w-16 rounded-full bg-background flex items-center justify-center">
                    <Users className="h-8 w-8 text-muted-foreground" />
                  </div>
                )}
                <div className="flex-1">
                  <p className="font-medium">{selectedReport.reported_profile?.name || "Unknown"}</p>
                  <p className="text-sm text-muted-foreground">
                    {selectedReport.reported_profile?.location || "No location"}
                  </p>
                </div>
                {selectedReport.reported_profile?.status && selectedReport.reported_profile.status !== "active" && (
                  <Badge variant="destructive" className="gap-1">
                    <Ban className="h-3 w-3" />
                    {selectedReport.reported_profile.status === "banned" ? "Banned" : "Suspended"}
                  </Badge>
                )}
              </div>

              {selectedReport.reported_profile?.status === "suspended" && selectedReport.reported_profile.suspended_until && (
                <div className="p-3 bg-yellow-500/10 border border-yellow-500/20 rounded-lg">
                  <p className="text-sm text-yellow-600 dark:text-yellow-400">
                    <strong>Currently suspended</strong> until {new Date(selectedReport.reported_profile.suspended_until).toLocaleDateString()}
                  </p>
                  {selectedReport.reported_profile.suspension_reason && (
                    <p className="text-xs text-muted-foreground mt-1">
                      Reason: {selectedReport.reported_profile.suspension_reason}
                    </p>
                  )}
                </div>
              )}

              {selectedReport.reported_profile?.status === "banned" && (
                <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-lg">
                  <p className="text-sm text-destructive">
                    <strong>This profile is permanently banned</strong>
                  </p>
                  {selectedReport.reported_profile.suspension_reason && (
                    <p className="text-xs text-muted-foreground mt-1">
                      Reason: {selectedReport.reported_profile.suspension_reason}
                    </p>
                  )}
                  <Button
                    variant="outline"
                    size="sm"
                    className="mt-2"
                    onClick={() => selectedReport.reported_profile && handleUnbanProfile(selectedReport.reported_profile)}
                    disabled={isProcessing}
                  >
                    Unban Profile
                  </Button>
                </div>
              )}

              <div>
                <p className="text-sm font-medium mb-1">Report Reason</p>
                <p className="text-sm text-muted-foreground">
                  {REASON_LABELS[selectedReport.reason] || selectedReport.reason}
                </p>
              </div>

              {selectedReport.details && (
                <div>
                  <p className="text-sm font-medium mb-1">Additional Details</p>
                  <p className="text-sm text-muted-foreground bg-muted p-3 rounded">
                    {selectedReport.details}
                  </p>
                </div>
              )}

              <div>
                <Label className="text-sm font-medium">Action on Profile</Label>
                <Select value={actionType} onValueChange={(v) => setActionType(v as "none" | "suspend" | "ban")}>
                  <SelectTrigger className="mt-1">
                    <SelectValue placeholder="Select action" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">No action on profile</SelectItem>
                    <SelectItem value="suspend">Suspend profile temporarily</SelectItem>
                    <SelectItem value="ban">Ban profile permanently</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {actionType === "suspend" && (
                <div>
                  <Label className="text-sm font-medium">Suspension Duration</Label>
                  <Select value={suspensionDuration} onValueChange={setSuspensionDuration}>
                    <SelectTrigger className="mt-1">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="1">1 day</SelectItem>
                      <SelectItem value="3">3 days</SelectItem>
                      <SelectItem value="7">7 days</SelectItem>
                      <SelectItem value="14">14 days</SelectItem>
                      <SelectItem value="30">30 days</SelectItem>
                      <SelectItem value="90">90 days</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}

              <div>
                <Label className="text-sm font-medium">Resolution Notes {actionType !== "none" ? "(reason for action)" : "(optional)"}</Label>
                <Textarea
                  placeholder={actionType !== "none" ? "Explain why this action is being taken..." : "Add notes about this report..."}
                  value={resolutionNotes}
                  onChange={(e) => setResolutionNotes(e.target.value)}
                  rows={3}
                  className="mt-1"
                />
              </div>

              <div className="flex gap-3 pt-2">
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={() => handleReportAction(selectedReport.id, "dismissed")}
                  disabled={isProcessing}
                >
                  Dismiss
                </Button>
                <Button
                  variant={actionType !== "none" ? "destructive" : "default"}
                  className="flex-1"
                  onClick={() => handleReportAction(selectedReport.id, "resolved")}
                  disabled={isProcessing}
                >
                  {actionType === "ban" ? "Ban & Resolve" : actionType === "suspend" ? "Suspend & Resolve" : "Resolve"}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Appeal Review Dialog */}
      <Dialog open={!!selectedAppeal} onOpenChange={(open) => {
        if (!open) {
          setSelectedAppeal(null);
          setAppealResponse("");
        }
      }}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Scale className="h-5 w-5 text-purple-600" />
              Review Appeal
            </DialogTitle>
            <DialogDescription>
              Review this ban appeal and decide whether to reinstate the profile.
            </DialogDescription>
          </DialogHeader>

          {selectedAppeal && (
            <div className="space-y-4">
              <div className="flex items-center gap-3 p-3 bg-muted rounded-lg">
                {selectedAppeal.profile?.photo_urls?.[0] ? (
                  <img
                    src={selectedAppeal.profile.photo_urls[0]}
                    alt={selectedAppeal.profile.name}
                    className="h-16 w-16 rounded-full object-cover"
                  />
                ) : (
                  <div className="h-16 w-16 rounded-full bg-background flex items-center justify-center">
                    <Users className="h-8 w-8 text-muted-foreground" />
                  </div>
                )}
                <div className="flex-1">
                  <p className="font-medium">{selectedAppeal.profile?.name || "Unknown"}</p>
                  <Badge variant="destructive" className="text-xs">
                    {selectedAppeal.profile?.status === "banned" ? "Banned" : "Suspended"}
                  </Badge>
                </div>
              </div>

              <div>
                <p className="text-sm font-medium mb-1">Appeal Reason</p>
                <p className="text-sm text-muted-foreground bg-muted p-3 rounded">
                  {selectedAppeal.appeal_reason}
                </p>
              </div>

              <div>
                <Label className="text-sm font-medium">Your Response</Label>
                <Textarea
                  placeholder="Provide a response to the user..."
                  value={appealResponse}
                  onChange={(e) => setAppealResponse(e.target.value)}
                  rows={3}
                  className="mt-1"
                />
              </div>

              <div className="flex gap-3 pt-2">
                <Button
                  variant="destructive"
                  className="flex-1"
                  onClick={() => handleAppealAction(selectedAppeal.id, "rejected")}
                  disabled={isProcessing}
                >
                  <XCircle className="h-4 w-4 mr-2" />
                  Reject
                </Button>
                <Button
                  className="flex-1"
                  onClick={() => handleAppealAction(selectedAppeal.id, "approved")}
                  disabled={isProcessing}
                >
                  <CheckCircle className="h-4 w-4 mr-2" />
                  Approve & Reinstate
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Admin;
