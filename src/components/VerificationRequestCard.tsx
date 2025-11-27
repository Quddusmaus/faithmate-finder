import { useTranslation } from "react-i18next";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Textarea } from "@/components/ui/textarea";
import { Check, X, Clock, MapPin } from "lucide-react";
import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

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

interface VerificationRequestCardProps {
  request: VerificationRequest;
  onApprove: (requestId: string) => Promise<void>;
  onReject: (requestId: string, reason: string) => Promise<void>;
  isProcessing: boolean;
}

export const VerificationRequestCard = ({
  request,
  onApprove,
  onReject,
  isProcessing,
}: VerificationRequestCardProps) => {
  const { t } = useTranslation();
  const [showRejectDialog, setShowRejectDialog] = useState(false);
  const [rejectionReason, setRejectionReason] = useState("");

  const handleReject = async () => {
    await onReject(request.id, rejectionReason);
    setShowRejectDialog(false);
    setRejectionReason("");
  };

  const getStatusBadge = () => {
    switch (request.status) {
      case "pending":
        return (
          <Badge variant="outline" className="gap-1 border-yellow-500 text-yellow-600">
            <Clock className="h-3 w-3" />
            {t("admin.pending")}
          </Badge>
        );
      case "approved":
        return (
          <Badge variant="default" className="gap-1 bg-green-500">
            <Check className="h-3 w-3" />
            {t("admin.approved")}
          </Badge>
        );
      case "rejected":
        return (
          <Badge variant="destructive" className="gap-1">
            <X className="h-3 w-3" />
            {t("admin.rejected")}
          </Badge>
        );
      default:
        return null;
    }
  };

  const profile = request.profile;

  return (
    <>
      <Card className="transition-shadow hover:shadow-md">
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <Avatar className="h-12 w-12">
                <AvatarImage src={profile?.photo_urls?.[0]} />
                <AvatarFallback>{profile?.name?.charAt(0) || "?"}</AvatarFallback>
              </Avatar>
              <div>
                <CardTitle className="text-lg">
                  {profile?.name || t("common.noResults")}
                  {profile?.age && `, ${profile.age}`}
                </CardTitle>
                {profile?.location && (
                  <div className="flex items-center gap-1 text-sm text-muted-foreground">
                    <MapPin className="h-3 w-3" />
                    {profile.location}
                  </div>
                )}
              </div>
            </div>
            {getStatusBadge()}
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {profile?.bio && (
            <p className="text-sm text-muted-foreground line-clamp-2">{profile.bio}</p>
          )}
          
          <div className="text-xs text-muted-foreground">
            {new Date(request.submitted_at).toLocaleDateString()}
          </div>

          {request.status === "rejected" && request.rejection_reason && (
            <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
              <strong>{t("appeal.reason")}:</strong> {request.rejection_reason}
            </div>
          )}

          {request.status === "pending" && (
            <div className="flex gap-2 pt-2">
              <Button
                onClick={() => onApprove(request.id)}
                disabled={isProcessing}
                className="flex-1 gap-1"
              >
                <Check className="h-4 w-4" />
                {t("admin.approve")}
              </Button>
              <Button
                variant="destructive"
                onClick={() => setShowRejectDialog(true)}
                disabled={isProcessing}
                className="flex-1 gap-1"
              >
                <X className="h-4 w-4" />
                {t("admin.reject")}
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={showRejectDialog} onOpenChange={setShowRejectDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("admin.reject")}</DialogTitle>
            <DialogDescription>
              {t("admin.resolutionNotes")}
            </DialogDescription>
          </DialogHeader>
          <Textarea
            placeholder={t("admin.resolutionNotes")}
            value={rejectionReason}
            onChange={(e) => setRejectionReason(e.target.value)}
            className="min-h-[100px]"
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowRejectDialog(false)}>
              {t("common.cancel")}
            </Button>
            <Button
              variant="destructive"
              onClick={handleReject}
              disabled={!rejectionReason.trim() || isProcessing}
            >
              {t("admin.reject")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};
