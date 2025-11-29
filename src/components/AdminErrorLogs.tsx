import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { 
  AlertCircle, 
  AlertTriangle, 
  Info, 
  XCircle, 
  CheckCircle, 
  Trash2, 
  RefreshCw,
  Bug,
  Clock
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { toast } from "sonner";

interface ErrorLog {
  id: string;
  user_id: string | null;
  error_message: string;
  error_stack: string | null;
  component_stack: string | null;
  url: string | null;
  user_agent: string | null;
  metadata: Record<string, unknown>;
  severity: "info" | "warning" | "error" | "critical";
  resolved: boolean;
  resolved_at: string | null;
  resolved_by: string | null;
  created_at: string;
}

interface ErrorStats {
  total: number;
  unresolved: number;
  critical: number;
  today: number;
}

const severityConfig = {
  info: { icon: Info, color: "text-blue-500", bg: "bg-blue-500/10", badge: "secondary" as const },
  warning: { icon: AlertTriangle, color: "text-yellow-500", bg: "bg-yellow-500/10", badge: "outline" as const },
  error: { icon: AlertCircle, color: "text-orange-500", bg: "bg-orange-500/10", badge: "destructive" as const },
  critical: { icon: XCircle, color: "text-red-500", bg: "bg-red-500/10", badge: "destructive" as const },
};

export const AdminErrorLogs = () => {
  const [errors, setErrors] = useState<ErrorLog[]>([]);
  const [stats, setStats] = useState<ErrorStats>({ total: 0, unresolved: 0, critical: 0, today: 0 });
  const [isLoading, setIsLoading] = useState(true);
  const [selectedError, setSelectedError] = useState<ErrorLog | null>(null);
  const [filter, setFilter] = useState<"all" | "unresolved" | "resolved">("unresolved");
  const [severityFilter, setSeverityFilter] = useState<"all" | "info" | "warning" | "error" | "critical">("all");

  const fetchErrors = async () => {
    try {
      setIsLoading(true);
      
      let query = supabase
        .from("error_logs")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(100);

      if (filter === "unresolved") {
        query = query.eq("resolved", false);
      } else if (filter === "resolved") {
        query = query.eq("resolved", true);
      }

      if (severityFilter !== "all") {
        query = query.eq("severity", severityFilter);
      }

      const { data, error } = await query;

      if (error) throw error;

      setErrors((data as ErrorLog[]) || []);

      // Calculate stats
      const { data: allErrors } = await supabase
        .from("error_logs")
        .select("severity, resolved, created_at");

      if (allErrors) {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        
        setStats({
          total: allErrors.length,
          unresolved: allErrors.filter(e => !e.resolved).length,
          critical: allErrors.filter(e => e.severity === "critical" && !e.resolved).length,
          today: allErrors.filter(e => new Date(e.created_at) >= today).length,
        });
      }
    } catch (error) {
      console.error("Error fetching error logs:", error);
      toast.error("Failed to load error logs");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchErrors();

    // Subscribe to realtime updates
    const channel = supabase
      .channel("error_logs_changes")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "error_logs" },
        () => {
          fetchErrors();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [filter, severityFilter]);

  const handleResolve = async (errorId: string) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      const { error } = await supabase
        .from("error_logs")
        .update({
          resolved: true,
          resolved_at: new Date().toISOString(),
          resolved_by: user?.id,
        })
        .eq("id", errorId);

      if (error) throw error;

      toast.success("Error marked as resolved");
      setSelectedError(null);
      fetchErrors();
    } catch (error) {
      console.error("Error resolving:", error);
      toast.error("Failed to resolve error");
    }
  };

  const handleDelete = async (errorId: string) => {
    try {
      const { error } = await supabase
        .from("error_logs")
        .delete()
        .eq("id", errorId);

      if (error) throw error;

      toast.success("Error log deleted");
      setSelectedError(null);
      fetchErrors();
    } catch (error) {
      console.error("Error deleting:", error);
      toast.error("Failed to delete error log");
    }
  };

  const handleBulkResolve = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      const { error } = await supabase
        .from("error_logs")
        .update({
          resolved: true,
          resolved_at: new Date().toISOString(),
          resolved_by: user?.id,
        })
        .eq("resolved", false);

      if (error) throw error;

      toast.success("All errors marked as resolved");
      fetchErrors();
    } catch (error) {
      console.error("Error bulk resolving:", error);
      toast.error("Failed to resolve errors");
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="grid gap-4 md:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-24" />
          ))}
        </div>
        <Skeleton className="h-96" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Errors</CardTitle>
            <Bug className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total}</div>
            <p className="text-xs text-muted-foreground">All time</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Unresolved</CardTitle>
            <AlertCircle className="h-4 w-4 text-orange-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-500">{stats.unresolved}</div>
            <p className="text-xs text-muted-foreground">Needs attention</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Critical</CardTitle>
            <XCircle className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-500">{stats.critical}</div>
            <p className="text-xs text-muted-foreground">Urgent issues</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Today</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.today}</div>
            <p className="text-xs text-muted-foreground">Last 24 hours</p>
          </CardContent>
        </Card>
      </div>

      {/* Filters and Actions */}
      <div className="flex flex-wrap gap-3 items-center justify-between">
        <div className="flex gap-3">
          <Select value={filter} onValueChange={(v) => setFilter(v as typeof filter)}>
            <SelectTrigger className="w-[140px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Errors</SelectItem>
              <SelectItem value="unresolved">Unresolved</SelectItem>
              <SelectItem value="resolved">Resolved</SelectItem>
            </SelectContent>
          </Select>

          <Select value={severityFilter} onValueChange={(v) => setSeverityFilter(v as typeof severityFilter)}>
            <SelectTrigger className="w-[140px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Severity</SelectItem>
              <SelectItem value="critical">Critical</SelectItem>
              <SelectItem value="error">Error</SelectItem>
              <SelectItem value="warning">Warning</SelectItem>
              <SelectItem value="info">Info</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={fetchErrors} className="gap-2">
            <RefreshCw className="h-4 w-4" />
            Refresh
          </Button>
          {stats.unresolved > 0 && (
            <Button variant="outline" size="sm" onClick={handleBulkResolve} className="gap-2">
              <CheckCircle className="h-4 w-4" />
              Resolve All
            </Button>
          )}
        </div>
      </div>

      {/* Error List */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bug className="h-5 w-5" />
            Error Logs ({errors.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {errors.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <CheckCircle className="h-12 w-12 mx-auto mb-4 text-green-500" />
              <p className="text-lg font-medium">No errors found</p>
              <p className="text-sm">Your application is running smoothly!</p>
            </div>
          ) : (
            <ScrollArea className="h-[500px]">
              <div className="space-y-3">
                {errors.map((error) => {
                  const config = severityConfig[error.severity];
                  const Icon = config.icon;
                  
                  return (
                    <div
                      key={error.id}
                      className={`p-4 rounded-lg border cursor-pointer transition-colors hover:bg-muted/50 ${
                        error.resolved ? "opacity-60" : ""
                      }`}
                      onClick={() => setSelectedError(error)}
                    >
                      <div className="flex items-start gap-3">
                        <div className={`p-2 rounded-full ${config.bg}`}>
                          <Icon className={`h-4 w-4 ${config.color}`} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <Badge variant={config.badge} className="text-xs">
                              {error.severity.toUpperCase()}
                            </Badge>
                            {error.resolved && (
                              <Badge variant="secondary" className="text-xs gap-1">
                                <CheckCircle className="h-3 w-3" />
                                Resolved
                              </Badge>
                            )}
                            <span className="text-xs text-muted-foreground">
                              {formatDistanceToNow(new Date(error.created_at), { addSuffix: true })}
                            </span>
                          </div>
                          <p className="mt-1 font-medium truncate">{error.error_message}</p>
                          {error.url && (
                            <p className="text-xs text-muted-foreground truncate mt-1">
                              {error.url}
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </ScrollArea>
          )}
        </CardContent>
      </Card>

      {/* Error Detail Dialog */}
      <Dialog open={!!selectedError} onOpenChange={() => setSelectedError(null)}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {selectedError && (
                <>
                  {(() => {
                    const config = severityConfig[selectedError.severity];
                    const Icon = config.icon;
                    return <Icon className={`h-5 w-5 ${config.color}`} />;
                  })()}
                  Error Details
                </>
              )}
            </DialogTitle>
          </DialogHeader>

          {selectedError && (
            <div className="space-y-4">
              <div className="flex items-center gap-2 flex-wrap">
                <Badge variant={severityConfig[selectedError.severity].badge}>
                  {selectedError.severity.toUpperCase()}
                </Badge>
                {selectedError.resolved && (
                  <Badge variant="secondary" className="gap-1">
                    <CheckCircle className="h-3 w-3" />
                    Resolved
                  </Badge>
                )}
                <span className="text-sm text-muted-foreground">
                  {formatDistanceToNow(new Date(selectedError.created_at), { addSuffix: true })}
                </span>
              </div>

              <div>
                <h4 className="text-sm font-medium mb-1">Error Message</h4>
                <p className="p-3 bg-muted rounded-lg font-mono text-sm break-all">
                  {selectedError.error_message}
                </p>
              </div>

              {selectedError.url && (
                <div>
                  <h4 className="text-sm font-medium mb-1">URL</h4>
                  <p className="p-3 bg-muted rounded-lg text-sm break-all">
                    {selectedError.url}
                  </p>
                </div>
              )}

              {selectedError.error_stack && (
                <div>
                  <h4 className="text-sm font-medium mb-1">Stack Trace</h4>
                  <pre className="p-3 bg-muted rounded-lg text-xs overflow-auto max-h-40 whitespace-pre-wrap">
                    {selectedError.error_stack}
                  </pre>
                </div>
              )}

              {selectedError.component_stack && (
                <div>
                  <h4 className="text-sm font-medium mb-1">Component Stack</h4>
                  <pre className="p-3 bg-muted rounded-lg text-xs overflow-auto max-h-40 whitespace-pre-wrap">
                    {selectedError.component_stack}
                  </pre>
                </div>
              )}

              {selectedError.user_agent && (
                <div>
                  <h4 className="text-sm font-medium mb-1">User Agent</h4>
                  <p className="p-3 bg-muted rounded-lg text-xs break-all">
                    {selectedError.user_agent}
                  </p>
                </div>
              )}

              {Object.keys(selectedError.metadata || {}).length > 0 && (
                <div>
                  <h4 className="text-sm font-medium mb-1">Metadata</h4>
                  <pre className="p-3 bg-muted rounded-lg text-xs overflow-auto max-h-40">
                    {JSON.stringify(selectedError.metadata, null, 2)}
                  </pre>
                </div>
              )}

              <div className="flex gap-2 pt-4 border-t">
                {!selectedError.resolved && (
                  <Button onClick={() => handleResolve(selectedError.id)} className="gap-2">
                    <CheckCircle className="h-4 w-4" />
                    Mark as Resolved
                  </Button>
                )}
                <Button
                  variant="destructive"
                  onClick={() => handleDelete(selectedError.id)}
                  className="gap-2"
                >
                  <Trash2 className="h-4 w-4" />
                  Delete
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};
