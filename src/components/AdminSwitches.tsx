import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { useAppSwitch, useSetAppSwitch } from "@/hooks/useAppSwitch";

/** Admin dashboard card with on/off switches that take effect without a Publish. */
export function AdminSwitches() {
  const calls = useAppSwitch("video_calls");
  const setCalls = useSetAppSwitch("video_calls");

  const onChange = (enabled: boolean) => {
    setCalls.mutate(enabled, {
      onSuccess: () => toast.success(enabled ? "Calls turned on" : "Calls turned off"),
      onError: (e) => toast.error(`Couldn't change the setting: ${e instanceof Error ? e.message : String(e)}`),
    });
  };

  return (
    <Card className="mb-8">
      <CardHeader className="pb-2">
        <CardTitle className="text-base">Feature switches</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex items-center justify-between gap-4">
          <div>
            <Label htmlFor="switch-video-calls" className="font-medium">
              Video and voice calls
            </Label>
            <p className="text-sm text-muted-foreground">
              Off hides the call buttons for every member within about a minute. Calls already in progress
              carry on.
            </p>
          </div>
          <Switch
            id="switch-video-calls"
            checked={calls.enabled}
            disabled={calls.isLoading || setCalls.isPending}
            onCheckedChange={onChange}
          />
        </div>
      </CardContent>
    </Card>
  );
}
