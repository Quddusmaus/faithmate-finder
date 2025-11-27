import { useState } from "react";
import { useTranslation } from "react-i18next";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { useToast } from "@/hooks/use-toast";
import { Flag, Loader2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

interface ReportProfileDialogProps {
  profileId: string;
  profileName: string;
  currentUserId: string | null;
}

const REPORT_REASONS = [
  { value: "fake_profile", labelKey: "report.fakeProfile" },
  { value: "inappropriate_content", labelKey: "report.inappropriateContent" },
  { value: "harassment", labelKey: "report.harassment" },
  { value: "spam", labelKey: "report.spam" },
  { value: "underage", labelKey: "report.underage" },
  { value: "other", labelKey: "report.other" },
];

export const ReportProfileDialog = ({
  profileId,
  profileName,
  currentUserId,
}: ReportProfileDialogProps) => {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [details, setDetails] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const { toast } = useToast();

  const handleSubmit = async () => {
    if (!currentUserId) {
      toast({
        title: t("auth.signIn"),
        description: t("auth.signInToContinue"),
        variant: "destructive",
      });
      return;
    }

    if (!reason) {
      toast({
        title: t("report.whyReporting"),
        description: t("report.whyReporting"),
        variant: "destructive",
      });
      return;
    }

    setSubmitting(true);
    try {
      const { error } = await supabase.from("profile_reports").insert({
        reporter_id: currentUserId,
        reported_profile_id: profileId,
        reason,
        details: details.trim() || null,
      });

      if (error) throw error;

      toast({
        title: t("report.reportSubmitted"),
        description: t("report.reportSubmitted"),
      });
      setOpen(false);
      setReason("");
      setDetails("");
    } catch (error: any) {
      console.error("Error submitting report:", error);
      toast({
        title: t("common.error"),
        description: error.message || t("common.error"),
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  };

  if (!currentUserId) {
    return null;
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 text-muted-foreground hover:text-destructive"
          title={t("report.reportProfile")}
        >
          <Flag className="h-4 w-4" />
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Flag className="h-5 w-5 text-destructive" />
            {t("report.reportProfile")}
          </DialogTitle>
          <DialogDescription>
            {t("report.reportProfile")} - {profileName}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          <div className="space-y-3">
            <Label className="text-base">{t("report.whyReporting")}</Label>
            <RadioGroup value={reason} onValueChange={setReason}>
              {REPORT_REASONS.map((item) => (
                <div key={item.value} className="flex items-center space-x-3">
                  <RadioGroupItem value={item.value} id={item.value} />
                  <Label htmlFor={item.value} className="font-normal cursor-pointer">
                    {t(item.labelKey)}
                  </Label>
                </div>
              ))}
            </RadioGroup>
          </div>

          <div className="space-y-2">
            <Label htmlFor="details">{t("report.additionalDetails")}</Label>
            <Textarea
              id="details"
              placeholder={t("report.additionalDetails")}
              value={details}
              onChange={(e) => setDetails(e.target.value)}
              maxLength={1000}
              rows={4}
            />
            <p className="text-xs text-muted-foreground">{details.length}/1000</p>
          </div>
        </div>

        <div className="flex gap-3">
          <Button
            variant="outline"
            className="flex-1"
            onClick={() => setOpen(false)}
            disabled={submitting}
          >
            {t("common.cancel")}
          </Button>
          <Button
            variant="destructive"
            className="flex-1"
            onClick={handleSubmit}
            disabled={submitting || !reason}
          >
            {submitting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                {t("common.loading")}
              </>
            ) : (
              t("report.submitReport")
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
