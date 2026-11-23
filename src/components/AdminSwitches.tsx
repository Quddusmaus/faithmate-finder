import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { type AppSwitchKey, useAppSwitch, useSetAppSwitch } from "@/hooks/useAppSwitch";

const SWITCHES: { key: AppSwitchKey; label: string; help: string; on: string; off: string }[] = [
  {
    key: "video_calls",
    label: "Video and voice calls",
    help: "Off hides the call buttons for every member, on every device, within about a minute. Calls already in progress carry on.",
    on: "Calls turned on",
    off: "Calls turned off",
  },
  {
    key: "video_calls_ios_app",
    label: "Calls in the iPhone app",
    help: "Off hides calls only inside the iPhone app. The website and the Android app keep them (if the switch above is on).",
    on: "Calls turned on in the iPhone app",
    off: "Calls turned off in the iPhone app",
  },
];

function SwitchRow({ item }: { item: (typeof SWITCHES)[number] }) {
  const current = useAppSwitch(item.key);
  const set = useSetAppSwitch(item.key);
  const id = `switch-${item.key}`;
  const onChange = (enabled: boolean) =>
    set.mutate(enabled, {
      onSuccess: () => toast.success(enabled ? item.on : item.off),
      onError: (e) => toast.error(`Couldn't change the setting: ${e instanceof Error ? e.message : String(e)}`),
    });

  return (
    <div className="flex items-center justify-between gap-4">
      <div>
        <Label htmlFor={id} className="font-medium">
          {item.label}
        </Label>
        <p className="text-sm text-muted-foreground">{item.help}</p>
      </div>
      <Switch id={id} checked={current.enabled} disabled={current.isLoading || set.isPending} onCheckedChange={onChange} />
    </div>
  );
}

/** Admin dashboard card with on/off switches that take effect without a Publish. */
export function AdminSwitches() {
  return (
    <Card className="mb-8">
      <CardHeader className="pb-2">
        <CardTitle className="text-base">Feature switches</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {SWITCHES.map((item) => (
          <SwitchRow key={item.key} item={item} />
        ))}
      </CardContent>
    </Card>
  );
}
