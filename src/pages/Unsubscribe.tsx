import { useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { Heart, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";

type Status = "idle" | "working" | "done" | "error";

// Landing page for the "Unsubscribe" link in notification emails.
// The member confirms with one tap; no sign-in needed (the link carries a signed token).
const Unsubscribe = () => {
  const [searchParams] = useSearchParams();
  const u = searchParams.get("u");
  const t = searchParams.get("t");
  const [status, setStatus] = useState<Status>("idle");
  const [message, setMessage] = useState("");

  const unsubscribe = async () => {
    setStatus("working");
    const { error } = await supabase.functions.invoke("unsubscribe", { body: { u, t } });
    if (error) {
      setStatus("error");
      setMessage("We couldn't update your email settings from this link. Please sign in and turn off emails in your profile settings.");
      return;
    }
    setStatus("done");
  };

  const linkIsValid = Boolean(u && t);

  return (
    <div className="flex min-h-screen items-center justify-center bg-muted p-6">
      <div className="w-full max-w-md rounded-xl bg-background p-8 text-center shadow-sm">
        <Heart className="mx-auto mb-4 h-8 w-8 text-primary" aria-hidden />
        {status === "done" ? (
          <>
            <h1 className="mb-2 text-2xl font-semibold">You're unsubscribed</h1>
            <p className="mb-6 text-muted-foreground">
              You won't get like, match or message emails from Uniting Hearts anymore. You can turn them back on any time in your profile settings.
            </p>
            <Button asChild><Link to="/">Back to Uniting Hearts</Link></Button>
          </>
        ) : (
          <>
            <h1 className="mb-2 text-2xl font-semibold">Unsubscribe from emails</h1>
            <p className="mb-6 text-muted-foreground">
              {linkIsValid
                ? "Stop getting emails about new likes, matches and messages?"
                : "This unsubscribe link is incomplete. Please use the link from your most recent email, or turn off emails in your profile settings."}
            </p>
            {status === "error" && <p className="mb-4 text-sm text-destructive">{message}</p>}
            {linkIsValid && (
              <Button onClick={unsubscribe} disabled={status === "working"}>
                {status === "working" && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Unsubscribe
              </Button>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default Unsubscribe;
