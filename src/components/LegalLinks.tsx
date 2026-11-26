import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { ChevronRight, FileText, LifeBuoy, Mail, ShieldCheck } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

// Settings card linking to the policy pages. Apple and Google both require the
// privacy policy to be reachable from inside the app, not only on the website.
export const LegalLinks = () => {
  const { t } = useTranslation();

  const links = [
    { to: "/privacy", label: t("nav.privacyPolicy"), icon: ShieldCheck },
    { to: "/terms", label: t("nav.termsOfService"), icon: FileText },
    { to: "/safety", label: "Safety Tips", icon: LifeBuoy },
    { to: "/contact", label: t("nav.contactUs"), icon: Mail },
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Legal & support</CardTitle>
      </CardHeader>
      <CardContent className="p-0 pb-2">
        <ul className="divide-y divide-border">
          {links.map(({ to, label, icon: Icon }) => (
            <li key={to}>
              <Link
                to={to}
                className="flex items-center gap-3 px-6 py-3 text-sm hover:bg-muted/50 transition-colors"
              >
                <Icon className="h-4 w-4 text-muted-foreground" />
                <span className="flex-1">{label}</span>
                <ChevronRight className="h-4 w-4 text-muted-foreground" />
              </Link>
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
};

export default LegalLinks;
