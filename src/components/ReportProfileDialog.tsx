import { useState } from "react";
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
  { value: "fake_profile", label: "Fake or misleading profile" },
  { value: "inappropriate_content", label: "Inappropriate photos or content" },
  { value: "harassment", label: "Harassment or abusive behavior" },
  { value: "spam", label: "Spam or scam" },
  { value: "underage", label: "User appears to be underage" },
  { value: "other", label: "Other" },
];

export const ReportProfileDialog = ({
  profileId,
  profileName,
  currentUserId,
}: ReportProfileDialogProps) => {
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [details, setDetails] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const { toast } = useToast();

  const handleSubmit = async () => {
    if (!currentUserId) {
      toast({
        title: "Sign in required",
        description: "Please sign in to report profiles.",
        variant: "destructive",
      });
      return;
    }

    if (!reason) {
      toast({
        title: "Select a reason",
        description: "Please select a reason for your report.",
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
        title: "Report submitted",
        description: "Thank you for helping keep our community safe. We'll review this report.",
      });
      setOpen(false);
      setReason("");
      setDetails("");
    } catch (error: any) {
      console.error("Error submitting report:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to submit report. Please try again.",
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
          title="Report profile"
        >
          <Flag className="h-4 w-4" />
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Flag className="h-5 w-5 text-destructive" />
            Report Profile
          </DialogTitle>
          <DialogDescription>
            Report {profileName}'s profile for violating our community guidelines.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          <div className="space-y-3">
            <Label className="text-base">Why are you reporting this profile?</Label>
            <RadioGroup value={reason} onValueChange={setReason}>
              {REPORT_REASONS.map((item) => (
                <div key={item.value} className="flex items-center space-x-3">
                  <RadioGroupItem value={item.value} id={item.value} />
                  <Label htmlFor={item.value} className="font-normal cursor-pointer">
                    {item.label}
                  </Label>
                </div>
              ))}
            </RadioGroup>
          </div>

          <div className="space-y-2">
            <Label htmlFor="details">Additional details (optional)</Label>
            <Textarea
              id="details"
              placeholder="Provide any additional information that might help us review this report..."
              value={details}
              onChange={(e) => setDetails(e.target.value)}
              maxLength={1000}
              rows={4}
            />
            <p className="text-xs text-muted-foreground">{details.length}/1000 characters</p>
          </div>
        </div>

        <div className="flex gap-3">
          <Button
            variant="outline"
            className="flex-1"
            onClick={() => setOpen(false)}
            disabled={submitting}
          >
            Cancel
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
                Submitting...
              </>
            ) : (
              "Submit Report"
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
