import { useEffect, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAdminStatus } from "@/hooks/useAdminStatus";
import { VerificationRequestCard } from "@/components/VerificationRequestCard";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Heart, Shield, Users, CheckCircle, XCircle, Clock, ArrowLeft } from "lucide-react";
import { toast } from "sonner";
import { Skeleton } from "@/components/ui/skeleton";

interface Profile {
  id: string;
  name: string;
  age: number | null;
  location: string | null;
  photo_urls: string[] | null;
  bio: string | null;
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

const Admin = () => {
  const navigate = useNavigate();
  const { isAdmin, isLoading: isAdminLoading } = useAdminStatus();
  const [requests, setRequests] = useState<VerificationRequest[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);
  const [activeTab, setActiveTab] = useState("pending");

  useEffect(() => {
    if (!isAdminLoading && !isAdmin) {
      toast.error("Access denied. Admin privileges required.");
      navigate("/");
    }
  }, [isAdmin, isAdminLoading, navigate]);

  useEffect(() => {
    if (isAdmin) {
      fetchVerificationRequests();
    }
  }, [isAdmin]);

  const fetchVerificationRequests = async () => {
    try {
      setIsLoading(true);
      
      // Fetch verification requests
      const { data: requestsData, error: requestsError } = await supabase
        .from("verification_requests")
        .select("*")
        .order("submitted_at", { ascending: false });

      if (requestsError) throw requestsError;

      // Fetch profiles for each request
      const requestsWithProfiles: VerificationRequest[] = [];
      
      for (const request of requestsData || []) {
        const { data: profileData } = await supabase
          .from("profiles")
          .select("id, name, age, location, photo_urls, bio")
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

  const handleApprove = async (requestId: string) => {
    try {
      setIsProcessing(true);
      
      const request = requests.find((r) => r.id === requestId);
      if (!request) return;

      const { data: { user } } = await supabase.auth.getUser();
      
      // Update verification request
      const { error: requestError } = await supabase
        .from("verification_requests")
        .update({
          status: "approved",
          reviewed_at: new Date().toISOString(),
          reviewed_by: user?.id,
        })
        .eq("id", requestId);

      if (requestError) throw requestError;

      // Update profile to verified
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

  const filteredRequests = requests.filter((r) => r.status === activeTab);

  const stats = {
    pending: requests.filter((r) => r.status === "pending").length,
    approved: requests.filter((r) => r.status === "approved").length,
    rejected: requests.filter((r) => r.status === "rejected").length,
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
              <div className="text-2xl font-bold">{stats.pending}</div>
              <p className="text-xs text-muted-foreground">Awaiting review</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Approved</CardTitle>
              <CheckCircle className="h-4 w-4 text-green-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.approved}</div>
              <p className="text-xs text-muted-foreground">Verified profiles</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Rejected</CardTitle>
              <XCircle className="h-4 w-4 text-red-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.rejected}</div>
              <p className="text-xs text-muted-foreground">Declined requests</p>
            </CardContent>
          </Card>
        </div>

        {/* Requests Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-3 mb-6">
            <TabsTrigger value="pending" className="gap-2">
              <Clock className="h-4 w-4" />
              Pending ({stats.pending})
            </TabsTrigger>
            <TabsTrigger value="approved" className="gap-2">
              <CheckCircle className="h-4 w-4" />
              Approved ({stats.approved})
            </TabsTrigger>
            <TabsTrigger value="rejected" className="gap-2">
              <XCircle className="h-4 w-4" />
              Rejected ({stats.rejected})
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
      </main>
    </div>
  );
};

export default Admin;
