import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { 
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Download, Trash2, Loader2, FileJson, AlertTriangle } from "lucide-react";
import { useNavigate } from "react-router-dom";

interface GDPRToolsProps {
  userId: string;
  userEmail: string;
}

export const GDPRTools = ({ userId, userEmail }: GDPRToolsProps) => {
  const { t } = useTranslation();
  const { toast } = useToast();
  const navigate = useNavigate();
  
  const [isExporting, setIsExporting] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [confirmEmail, setConfirmEmail] = useState("");

  const exportUserData = async () => {
    setIsExporting(true);
    
    try {
      // Fetch all user data from various tables
      const [
        profileResult,
        messagesResult,
        likesResult,
        notificationsResult,
        preferencesResult,
        verificationsResult
      ] = await Promise.all([
        supabase.from("profiles").select("*").eq("user_id", userId).maybeSingle(),
        supabase.from("messages").select("*").or(`sender_id.eq.${userId},receiver_id.eq.${userId}`),
        supabase.from("likes").select("*").or(`user_id.eq.${userId},liked_user_id.eq.${userId}`),
        supabase.from("notifications").select("*").eq("user_id", userId),
        supabase.from("notification_preferences").select("*").eq("user_id", userId).maybeSingle(),
        supabase.from("photo_verifications").select("*").eq("user_id", userId)
      ]);

      const userData = {
        exportDate: new Date().toISOString(),
        userId,
        email: userEmail,
        profile: profileResult.data,
        messages: messagesResult.data || [],
        likes: likesResult.data || [],
        notifications: notificationsResult.data || [],
        notificationPreferences: preferencesResult.data,
        photoVerifications: verificationsResult.data || []
      };

      // Create and download JSON file
      const blob = new Blob([JSON.stringify(userData, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `unity-hearts-data-export-${new Date().toISOString().split("T")[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      toast({
        title: "Data Exported",
        description: "Your data has been downloaded successfully.",
      });
    } catch (error: any) {
      console.error("Export error:", error);
      toast({
        title: "Export Failed",
        description: "Failed to export your data. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsExporting(false);
    }
  };

  const deleteAccount = async () => {
    if (confirmEmail.toLowerCase() !== userEmail.toLowerCase()) {
      toast({
        title: "Email Mismatch",
        description: "Please enter your email correctly to confirm deletion.",
        variant: "destructive",
      });
      return;
    }

    setIsDeleting(true);

    try {
      // Delete user data from all tables (cascade should handle most)
      // The profile deletion should trigger cascades, but let's be thorough
      
      // Delete messages (both sent and received)
      await supabase.from("messages").delete().eq("sender_id", userId);
      
      // Delete likes
      await supabase.from("likes").delete().eq("user_id", userId);
      
      // Delete notifications
      await supabase.from("notifications").delete().eq("user_id", userId);
      
      // Delete notification preferences
      await supabase.from("notification_preferences").delete().eq("user_id", userId);
      
      // Delete photo verifications
      await supabase.from("photo_verifications").delete().eq("user_id", userId);
      
      // Delete blocked users
      await supabase.from("blocked_users").delete().or(`blocker_id.eq.${userId},blocked_id.eq.${userId}`);
      
      // Delete profile (main data)
      await supabase.from("profiles").delete().eq("user_id", userId);

      // Sign out and redirect
      await supabase.auth.signOut();
      
      toast({
        title: "Account Deleted",
        description: "Your account and all associated data have been deleted.",
      });
      
      navigate("/");
    } catch (error: any) {
      console.error("Delete error:", error);
      toast({
        title: "Deletion Failed",
        description: error.message || "Failed to delete your account. Please contact support.",
        variant: "destructive",
      });
    } finally {
      setIsDeleting(false);
      setShowDeleteDialog(false);
    }
  };

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <FileJson className="h-5 w-5" />
            Data & Privacy (GDPR)
          </CardTitle>
          <CardDescription>
            Manage your personal data in accordance with privacy regulations
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Export Data */}
          <div className="flex items-center justify-between p-4 bg-muted rounded-lg">
            <div className="flex items-center gap-3">
              <Download className="h-5 w-5 text-primary" />
              <div>
                <p className="font-medium">Export Your Data</p>
                <p className="text-sm text-muted-foreground">
                  Download all your personal data in JSON format
                </p>
              </div>
            </div>
            <Button 
              variant="outline" 
              onClick={exportUserData}
              disabled={isExporting}
            >
              {isExporting ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                "Export"
              )}
            </Button>
          </div>

          {/* Delete Account */}
          <div className="flex items-center justify-between p-4 bg-destructive/5 border border-destructive/20 rounded-lg">
            <div className="flex items-center gap-3">
              <Trash2 className="h-5 w-5 text-destructive" />
              <div>
                <p className="font-medium text-destructive">Delete Account</p>
                <p className="text-sm text-muted-foreground">
                  Permanently delete your account and all data
                </p>
              </div>
            </div>
            <Button 
              variant="destructive" 
              onClick={() => setShowDeleteDialog(true)}
            >
              Delete
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 text-destructive">
              <AlertTriangle className="h-5 w-5" />
              Delete Your Account?
            </AlertDialogTitle>
            <AlertDialogDescription className="space-y-3">
              <p>
                This action cannot be undone. This will permanently delete your account 
                and remove all your data from our servers, including:
              </p>
              <ul className="list-disc list-inside text-sm space-y-1">
                <li>Your profile and photos</li>
                <li>All messages you've sent</li>
                <li>Your matches and likes</li>
                <li>Notification preferences</li>
                <li>Verification data</li>
              </ul>
              <div className="pt-2">
                <Label htmlFor="confirm-email" className="text-foreground">
                  Type your email to confirm: <strong>{userEmail}</strong>
                </Label>
                <Input
                  id="confirm-email"
                  type="email"
                  placeholder="Enter your email"
                  value={confirmEmail}
                  onChange={(e) => setConfirmEmail(e.target.value)}
                  className="mt-2"
                />
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setConfirmEmail("")}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={deleteAccount}
              disabled={isDeleting || confirmEmail.toLowerCase() !== userEmail.toLowerCase()}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isDeleting ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : null}
              Delete My Account
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};
