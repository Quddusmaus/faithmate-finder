import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { Users, UserCheck, Clock, CheckCircle, XCircle, Flag, AlertTriangle, TrendingUp, Shield } from "lucide-react";
import { PieChart, Pie, Cell, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, Legend } from "recharts";

interface AnalyticsData {
  totalProfiles: number;
  activeProfiles: number;
  verifiedProfiles: number;
  suspendedProfiles: number;
  bannedProfiles: number;
  verificationStats: {
    pending: number;
    approved: number;
    rejected: number;
  };
  reportStats: {
    pending: number;
    resolved: number;
    dismissed: number;
  };
  appealStats: {
    pending: number;
    approved: number;
    rejected: number;
  };
}

const COLORS = {
  primary: "hsl(var(--primary))",
  success: "#22c55e",
  warning: "#f59e0b",
  destructive: "#ef4444",
  muted: "hsl(var(--muted-foreground))",
};

export const AdminAnalytics = () => {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchAnalytics();
  }, []);

  const fetchAnalytics = async () => {
    try {
      setIsLoading(true);

      // Fetch profiles data
      const { data: profiles, error: profilesError } = await supabase
        .from("profiles")
        .select("status, verified");

      if (profilesError) throw profilesError;

      // Fetch verification requests
      const { data: verifications, error: verificationError } = await supabase
        .from("verification_requests")
        .select("status");

      if (verificationError) throw verificationError;

      // Fetch reports
      const { data: reports, error: reportsError } = await supabase
        .from("profile_reports")
        .select("status");

      if (reportsError) throw reportsError;

      // Fetch appeals
      const { data: appeals, error: appealsError } = await supabase
        .from("ban_appeals")
        .select("status");

      if (appealsError) throw appealsError;

      // Calculate stats
      const analyticsData: AnalyticsData = {
        totalProfiles: profiles?.length || 0,
        activeProfiles: profiles?.filter(p => p.status === "active").length || 0,
        verifiedProfiles: profiles?.filter(p => p.verified).length || 0,
        suspendedProfiles: profiles?.filter(p => p.status === "suspended").length || 0,
        bannedProfiles: profiles?.filter(p => p.status === "banned").length || 0,
        verificationStats: {
          pending: verifications?.filter(v => v.status === "pending").length || 0,
          approved: verifications?.filter(v => v.status === "approved").length || 0,
          rejected: verifications?.filter(v => v.status === "rejected").length || 0,
        },
        reportStats: {
          pending: reports?.filter(r => r.status === "pending").length || 0,
          resolved: reports?.filter(r => r.status === "resolved").length || 0,
          dismissed: reports?.filter(r => r.status === "dismissed").length || 0,
        },
        appealStats: {
          pending: appeals?.filter(a => a.status === "pending").length || 0,
          approved: appeals?.filter(a => a.status === "approved").length || 0,
          rejected: appeals?.filter(a => a.status === "rejected").length || 0,
        },
      };

      setData(analyticsData);
    } catch (error) {
      console.error("Error fetching analytics:", error);
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading || !data) {
    return (
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        {[1, 2, 3, 4].map((i) => (
          <Card key={i} className="animate-pulse">
            <CardHeader className="pb-2">
              <div className="h-4 bg-muted rounded w-1/2" />
            </CardHeader>
            <CardContent>
              <div className="h-8 bg-muted rounded w-1/3" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  const verificationChartData = [
    { name: "Pending", value: data.verificationStats.pending, color: COLORS.warning },
    { name: "Approved", value: data.verificationStats.approved, color: COLORS.success },
    { name: "Rejected", value: data.verificationStats.rejected, color: COLORS.destructive },
  ];

  const reportChartData = [
    { name: "Pending", value: data.reportStats.pending, color: COLORS.warning },
    { name: "Resolved", value: data.reportStats.resolved, color: COLORS.success },
    { name: "Dismissed", value: data.reportStats.dismissed, color: COLORS.muted },
  ];

  const barChartData = [
    { 
      name: "Verifications", 
      Pending: data.verificationStats.pending, 
      Approved: data.verificationStats.approved, 
      Rejected: data.verificationStats.rejected 
    },
    { 
      name: "Reports", 
      Pending: data.reportStats.pending, 
      Resolved: data.reportStats.resolved, 
      Dismissed: data.reportStats.dismissed 
    },
    { 
      name: "Appeals", 
      Pending: data.appealStats.pending, 
      Approved: data.appealStats.approved, 
      Rejected: data.appealStats.rejected 
    },
  ];

  return (
    <div className="space-y-8">
      {/* Overview Stats */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
        <Card className="bg-gradient-to-br from-primary/10 to-primary/5 border-primary/20">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Total Users</CardTitle>
            <Users className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{data.totalProfiles}</div>
            <p className="text-xs text-muted-foreground">Registered profiles</p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-green-500/10 to-green-500/5 border-green-500/20">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Active</CardTitle>
            <TrendingUp className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-green-600">{data.activeProfiles}</div>
            <p className="text-xs text-muted-foreground">Active profiles</p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-blue-500/10 to-blue-500/5 border-blue-500/20">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Verified</CardTitle>
            <Shield className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-blue-600">{data.verifiedProfiles}</div>
            <p className="text-xs text-muted-foreground">Verified members</p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-yellow-500/10 to-yellow-500/5 border-yellow-500/20">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Suspended</CardTitle>
            <Clock className="h-4 w-4 text-yellow-500" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-yellow-600">{data.suspendedProfiles}</div>
            <p className="text-xs text-muted-foreground">Temp. suspended</p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-red-500/10 to-red-500/5 border-red-500/20">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Banned</CardTitle>
            <AlertTriangle className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-red-600">{data.bannedProfiles}</div>
            <p className="text-xs text-muted-foreground">Permanently banned</p>
          </CardContent>
        </Card>
      </div>

      {/* Charts Row */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {/* Verification Pie Chart */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <UserCheck className="h-5 w-5 text-primary" />
              Verification Status
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[200px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={verificationChartData}
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={80}
                    paddingAngle={2}
                    dataKey="value"
                  >
                    {verificationChartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: 'hsl(var(--card))', 
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px'
                    }} 
                  />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="mt-4 grid grid-cols-3 gap-2 text-center text-sm">
              <div>
                <div className="font-semibold text-yellow-600">{data.verificationStats.pending}</div>
                <div className="text-muted-foreground text-xs">Pending</div>
              </div>
              <div>
                <div className="font-semibold text-green-600">{data.verificationStats.approved}</div>
                <div className="text-muted-foreground text-xs">Approved</div>
              </div>
              <div>
                <div className="font-semibold text-red-600">{data.verificationStats.rejected}</div>
                <div className="text-muted-foreground text-xs">Rejected</div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Reports Pie Chart */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Flag className="h-5 w-5 text-destructive" />
              Report Status
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[200px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={reportChartData}
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={80}
                    paddingAngle={2}
                    dataKey="value"
                  >
                    {reportChartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: 'hsl(var(--card))', 
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px'
                    }} 
                  />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="mt-4 grid grid-cols-3 gap-2 text-center text-sm">
              <div>
                <div className="font-semibold text-yellow-600">{data.reportStats.pending}</div>
                <div className="text-muted-foreground text-xs">Pending</div>
              </div>
              <div>
                <div className="font-semibold text-green-600">{data.reportStats.resolved}</div>
                <div className="text-muted-foreground text-xs">Resolved</div>
              </div>
              <div>
                <div className="font-semibold text-muted-foreground">{data.reportStats.dismissed}</div>
                <div className="text-muted-foreground text-xs">Dismissed</div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Appeals Summary */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <AlertTriangle className="h-5 w-5 text-purple-500" />
              Appeals Summary
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between p-3 rounded-lg bg-yellow-500/10">
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4 text-yellow-600" />
                  <span className="text-sm font-medium">Pending</span>
                </div>
                <span className="text-2xl font-bold text-yellow-600">{data.appealStats.pending}</span>
              </div>
              <div className="flex items-center justify-between p-3 rounded-lg bg-green-500/10">
                <div className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-green-600" />
                  <span className="text-sm font-medium">Approved</span>
                </div>
                <span className="text-2xl font-bold text-green-600">{data.appealStats.approved}</span>
              </div>
              <div className="flex items-center justify-between p-3 rounded-lg bg-red-500/10">
                <div className="flex items-center gap-2">
                  <XCircle className="h-4 w-4 text-red-600" />
                  <span className="text-sm font-medium">Rejected</span>
                </div>
                <span className="text-2xl font-bold text-red-600">{data.appealStats.rejected}</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Overview Bar Chart */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <TrendingUp className="h-5 w-5 text-primary" />
            Activity Overview
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={barChartData}>
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: 'hsl(var(--card))', 
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '8px'
                  }} 
                />
                <Legend />
                <Bar dataKey="Pending" fill={COLORS.warning} radius={[4, 4, 0, 0]} />
                <Bar dataKey="Approved" fill={COLORS.success} radius={[4, 4, 0, 0]} />
                <Bar dataKey="Rejected" fill={COLORS.destructive} radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
