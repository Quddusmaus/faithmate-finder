import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Mail } from "lucide-react";

interface Preferences {
  email_messages: boolean;
  email_likes: boolean;
  email_matches: boolean;
}

interface NotificationPreferencesProps {
  userId: string;
}

export const NotificationPreferences = ({ userId }: NotificationPreferencesProps) => {
  const [preferences, setPreferences] = useState<Preferences>({
    email_messages: true,
    email_likes: true,
    email_matches: true,
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    fetchPreferences();
  }, [userId]);

  const fetchPreferences = async () => {
    try {
      const { data, error } = await supabase
        .from("notification_preferences")
        .select("*")
        .eq("user_id", userId)
        .maybeSingle();

      if (error) throw error;

      if (data) {
        setPreferences({
          email_messages: data.email_messages,
          email_likes: data.email_likes,
          email_matches: data.email_matches,
        });
      } else {
        // Create default preferences if they don't exist
        const { error: insertError } = await supabase
          .from("notification_preferences")
          .insert({ user_id: userId });
        
        if (insertError && !insertError.message.includes("duplicate")) {
          throw insertError;
        }
      }
    } catch (error: any) {
      console.error("Error fetching preferences:", error);
    } finally {
      setLoading(false);
    }
  };

  const updatePreference = async (key: keyof Preferences, value: boolean) => {
    setSaving(true);
    const newPreferences = { ...preferences, [key]: value };
    setPreferences(newPreferences);

    try {
      const { error } = await supabase
        .from("notification_preferences")
        .upsert({
          user_id: userId,
          ...newPreferences,
        });

      if (error) throw error;

      toast({
        title: "Preferences saved",
        description: "Your notification preferences have been updated.",
      });
    } catch (error: any) {
      console.error("Error saving preferences:", error);
      // Revert on error
      setPreferences(preferences);
      toast({
        title: "Error",
        description: "Failed to save preferences.",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Mail className="h-5 w-5" />
          Email Notifications
        </CardTitle>
        <CardDescription>
          Choose which notifications you want to receive via email
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <Label htmlFor="email-messages" className="text-base">
              New Messages
            </Label>
            <p className="text-sm text-muted-foreground">
              Get notified when someone sends you a message
            </p>
          </div>
          <Switch
            id="email-messages"
            checked={preferences.email_messages}
            onCheckedChange={(checked) => updatePreference("email_messages", checked)}
            disabled={saving}
          />
        </div>

        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <Label htmlFor="email-likes" className="text-base">
              New Likes
            </Label>
            <p className="text-sm text-muted-foreground">
              Get notified when someone likes your profile
            </p>
          </div>
          <Switch
            id="email-likes"
            checked={preferences.email_likes}
            onCheckedChange={(checked) => updatePreference("email_likes", checked)}
            disabled={saving}
          />
        </div>

        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <Label htmlFor="email-matches" className="text-base">
              New Matches
            </Label>
            <p className="text-sm text-muted-foreground">
              Get notified when you match with someone
            </p>
          </div>
          <Switch
            id="email-matches"
            checked={preferences.email_matches}
            onCheckedChange={(checked) => updatePreference("email_matches", checked)}
            disabled={saving}
          />
        </div>
      </CardContent>
    </Card>
  );
};
