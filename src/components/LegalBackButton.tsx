import { useLocation, useNavigate } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";

// "Back" for the public legal pages. Opened from inside the app (Settings, the
// sign-up form) it returns to where the member was, instead of dumping them
// on the landing page. Opened directly from a link, there is no in-app history,
// so it goes home.
export const LegalBackButton = () => {
  const navigate = useNavigate();
  // React Router gives the first page of a visit the key "default"; any page
  // reached by navigating inside the app has a real key, so there is a page to
  // go back to.
  const cameFromInsideApp = useLocation().key !== "default";

  const goBack = () => {
    if (cameFromInsideApp) navigate(-1);
    else navigate("/");
  };

  return (
    <Button variant="ghost" className="gap-2" onClick={goBack}>
      <ArrowLeft className="h-4 w-4" />
      Back
    </Button>
  );
};

export default LegalBackButton;
