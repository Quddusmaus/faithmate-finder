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
      title: "Messaging Safety",
      color: "text-blue-500",
      tips: [
        "Keep conversations on Unity Hearts until you feel comfortable",
        "Never share financial information or send money",
        "Be cautious of anyone who asks for personal details too quickly",
        "Trust your instincts - if something feels off, it probably is"
      ]
    },
    {
      icon: Users,
      title: "Meeting in Person",
      color: "text-green-500",
      tips: [
        "Always meet in a public place for first dates",
        "Tell a friend or family member where you're going",
        "Arrange your own transportation to and from the date",
        "Keep your phone charged and easily accessible"
      ]
    },
    {
      icon: Eye,
      title: "Protecting Your Privacy",
      color: "text-purple-500",
      tips: [
        "Don't share your home or work address early on",
        "Use Unity Hearts messaging instead of personal phone/email",
        "Be mindful of what's visible in your photos (addresses, workplace)",
        "Research your match before meeting - a simple search is OK"
      ]
    },
    {
      icon: AlertTriangle,
      title: "Recognizing Red Flags",
      color: "text-amber-500",
      tips: [
        "Requests for money or financial help",
        "Refusing to video chat or meet in person",
        "Inconsistent stories or evasive answers",
        "Pressuring you to move off the platform quickly",
        "Love bombing - excessive affection very early on"
      ]
    },
    {
      icon: Lock,
      title: "Online Security",
      color: "text-red-500",
      tips: [
        "Use a strong, unique password for your account",
        "Never click suspicious links sent in messages",
        "Report and block anyone who makes you uncomfortable",
        "Enable two-factor authentication if available"
      ]
    },
    {
      icon: Video,
      title: "Video Call Safety",
      color: "text-cyan-500",
      tips: [
        "Video chat before meeting in person to verify identity",
        "Be aware of what's visible in your background",
        "You can end a call at any time - no explanation needed",
        "Trust your instincts about the person's authenticity"
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
              <h1 className="text-xl font-bold">Safety Tips</h1>
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
                <h2 className="text-xl font-semibold mb-2">Your Safety Matters</h2>
                <p className="text-muted-foreground">
                  At Unity Hearts, your safety is our top priority. Whether you're chatting online 
                  or meeting in person, these guidelines will help you have a safe and positive 
                  experience while finding meaningful connections.
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
              <CardTitle>Report Concerns</CardTitle>
            </div>
            <CardDescription>
              If someone makes you feel unsafe, don't hesitate to take action
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 md:grid-cols-3">
              <div className="p-4 bg-background rounded-lg">
                <h4 className="font-medium mb-1">Block Users</h4>
                <p className="text-sm text-muted-foreground">
                  Instantly prevent someone from contacting you
                </p>
              </div>
              <div className="p-4 bg-background rounded-lg">
                <h4 className="font-medium mb-1">Report Profiles</h4>
                <p className="text-sm text-muted-foreground">
                  Alert our team to investigate suspicious behavior
                </p>
              </div>
              <div className="p-4 bg-background rounded-lg">
                <h4 className="font-medium mb-1">Contact Support</h4>
                <p className="text-sm text-muted-foreground">
                  Reach out to us through the contact page
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
              <CardTitle>Emergency Resources</CardTitle>
            </div>
            <CardDescription>
              If you're in immediate danger, please contact emergency services (911 in US)
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
              Back to Profiles
            </Link>
          </Button>
        </div>
      </div>
    </div>
  );
};

export default SafetyTips;
