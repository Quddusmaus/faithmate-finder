import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  Shield, Heart, AlertTriangle, UserX, MessageCircle, 
  Video, MapPin, CreditCard, Phone, ArrowLeft, CheckCircle,
  Eye, Lock, Users
} from "lucide-react";

const SafetyTips = () => {
  const { t } = useTranslation();

  const safetyCategories = [
    {
      icon: MessageCircle,
      title: t('safety.messagingSafety'),
      color: "text-blue-500",
      tips: [
        t('safety.messagingTip1'),
        t('safety.messagingTip2'),
        t('safety.messagingTip3'),
        t('safety.messagingTip4')
      ]
    },
    {
      icon: Users,
      title: t('safety.meetingInPerson'),
      color: "text-green-500",
      tips: [
        t('safety.meetingTip1'),
        t('safety.meetingTip2'),
        t('safety.meetingTip3'),
        t('safety.meetingTip4')
      ]
    },
    {
      icon: Eye,
      title: t('safety.protectingPrivacy'),
      color: "text-purple-500",
      tips: [
        t('safety.privacyTip1'),
        t('safety.privacyTip2'),
        t('safety.privacyTip3'),
        t('safety.privacyTip4')
      ]
    },
    {
      icon: AlertTriangle,
      title: t('safety.redFlags'),
      color: "text-amber-500",
      tips: [
        t('safety.redFlagTip1'),
        t('safety.redFlagTip2'),
        t('safety.redFlagTip3'),
        t('safety.redFlagTip4'),
        t('safety.redFlagTip5')
      ]
    },
    {
      icon: Lock,
      title: t('safety.onlineSecurity'),
      color: "text-red-500",
      tips: [
        t('safety.securityTip1'),
        t('safety.securityTip2'),
        t('safety.securityTip3'),
        t('safety.securityTip4')
      ]
    },
    {
      icon: Video,
      title: t('safety.videoCallSafety'),
      color: "text-cyan-500",
      tips: [
        t('safety.videoTip1'),
        t('safety.videoTip2'),
        t('safety.videoTip3'),
        t('safety.videoTip4')
      ]
    }
  ];

  const emergencyResources = [
    { name: "National Domestic Violence Hotline", contact: "1-800-799-7233", region: "US" },
    { name: "Crisis Text Line", contact: "Text HOME to 741741", region: "US" },
    { name: "Samaritans", contact: "116 123", region: "UK" },
    { name: "Beyond Blue", contact: "1300 22 4636", region: "AU" }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-muted to-background">
      {/* Header */}
      <div className="border-b bg-background/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" asChild>
              <Link to="/profiles">
                <ArrowLeft className="h-5 w-5" />
              </Link>
            </Button>
            <div className="flex items-center gap-2">
              <Shield className="h-6 w-6 text-primary" />
              <h1 className="text-xl font-bold">{t('safety.safetyTips')}</h1>
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8 max-w-4xl">
        {/* Hero Section */}
        <Card className="mb-8 border-primary/20 bg-primary/5">
          <CardContent className="pt-6">
            <div className="flex flex-col md:flex-row items-center gap-4">
              <div className="flex-shrink-0">
                <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center">
                  <Heart className="h-8 w-8 text-primary" />
                </div>
              </div>
              <div>
                <h2 className="text-xl font-semibold mb-2">{t('safety.yourSafetyMatters')}</h2>
                <p className="text-muted-foreground">
                  {t('safety.safetyIntro')}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Safety Categories */}
        <div className="grid gap-6 md:grid-cols-2 mb-8">
          {safetyCategories.map((category, index) => (
            <Card key={index} className="transition-shadow hover:shadow-md">
              <CardHeader className="pb-3">
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-lg bg-muted ${category.color}`}>
                    <category.icon className="h-5 w-5" />
                  </div>
                  <CardTitle className="text-lg">{category.title}</CardTitle>
                </div>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2">
                  {category.tips.map((tip, tipIndex) => (
                    <li key={tipIndex} className="flex items-start gap-2 text-sm text-muted-foreground">
                      <CheckCircle className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                      <span>{tip}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Report Section */}
        <Card className="mb-8 border-destructive/20 bg-destructive/5">
          <CardHeader>
            <div className="flex items-center gap-3">
              <UserX className="h-6 w-6 text-destructive" />
              <CardTitle>{t('safety.reportConcerns')}</CardTitle>
            </div>
            <CardDescription>
              {t('safety.reportConcernsDesc')}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 md:grid-cols-3">
              <div className="p-4 bg-background rounded-lg">
                <h4 className="font-medium mb-1">{t('safety.blockUsers')}</h4>
                <p className="text-sm text-muted-foreground">
                  {t('safety.blockUsersDesc')}
                </p>
              </div>
              <div className="p-4 bg-background rounded-lg">
                <h4 className="font-medium mb-1">{t('safety.reportProfiles')}</h4>
                <p className="text-sm text-muted-foreground">
                  {t('safety.reportProfilesDesc')}
                </p>
              </div>
              <div className="p-4 bg-background rounded-lg">
                <h4 className="font-medium mb-1">{t('safety.contactSupport')}</h4>
                <p className="text-sm text-muted-foreground">
                  {t('safety.contactSupportDesc')}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Emergency Resources */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              <Phone className="h-6 w-6 text-primary" />
              <CardTitle>{t('safety.emergencyResources')}</CardTitle>
            </div>
            <CardDescription>
              {t('safety.emergencyResourcesDesc')}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-3 sm:grid-cols-2">
              {emergencyResources.map((resource, index) => (
                <div key={index} className="flex items-center justify-between p-3 bg-muted rounded-lg">
                  <div>
                    <p className="font-medium text-sm">{resource.name}</p>
                    <p className="text-primary text-sm">{resource.contact}</p>
                  </div>
                  <Badge variant="outline">{resource.region}</Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Back button */}
        <div className="mt-8 text-center">
          <Button asChild>
            <Link to="/profiles">
              <ArrowLeft className="h-4 w-4 mr-2" />
              {t('safety.backToProfiles')}
            </Link>
          </Button>
        </div>
      </div>
    </div>
  );
};

export default SafetyTips;