import { useMemo, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { format } from "date-fns";
import { useAuth, useLogout } from "@/hooks/use-auth";
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@quicklogo/ui/components/avatar";
import { Button, buttonVariants } from "@quicklogo/ui/components/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@quicklogo/ui/components/card";
import { Input } from "@quicklogo/ui/components/input";
import { Label } from "@quicklogo/ui/components/label";
import { Separator } from "@quicklogo/ui/components/separator";
import { Switch } from "@quicklogo/ui/components/switch";
import { toast } from "@quicklogo/ui/components/sonner";
import { cn } from "@quicklogo/ui/lib/utils";
import {
  ArrowSquareOutIcon,
  BellIcon,
  CalendarBlankIcon,
  CheckCircleIcon,
  EnvelopeSimpleIcon,
  FloppyDiskIcon,
  LightningIcon,
  SignOutIcon,
  SparkleIcon,
  SpinnerGapIcon,
  UserCircleIcon,
  WarningCircleIcon,
} from "@phosphor-icons/react";

export const Route = createFileRoute("/_authenticated/settings")({
  component: SettingsPage,
  head: () => ({
    meta: [
      { title: "Settings | QuickLogo" },
      { name: "description", content: "Manage your account and preferences." },
    ],
  }),
});

type SettingsPreferences = {
  productUpdates: boolean;
  billingReminders: boolean;
  aiTips: boolean;
};

const SETTINGS_STORAGE_KEY = "quicklogo.settings.preferences";

const DEFAULT_PREFERENCES: SettingsPreferences = {
  productUpdates: true,
  billingReminders: true,
  aiTips: true,
};

function parseDate(value: unknown): Date | null {
  if (!value) return null;
  const date = value instanceof Date ? value : new Date(String(value));
  return Number.isNaN(date.getTime()) ? null : date;
}

function SettingsPage() {
  const { user, isLoading } = useAuth();
  const { mutate: logout, isPending: isLoggingOut } = useLogout();

  const [preferences, setPreferences] = useState<SettingsPreferences>(() => {
    if (typeof window === "undefined") return DEFAULT_PREFERENCES;

    try {
      const stored = localStorage.getItem(SETTINGS_STORAGE_KEY);
      if (!stored) return DEFAULT_PREFERENCES;

      const parsed = JSON.parse(stored) as Partial<SettingsPreferences>;
      return { ...DEFAULT_PREFERENCES, ...parsed };
    } catch {
      return DEFAULT_PREFERENCES;
    }
  });

  const [isDirty, setIsDirty] = useState(false);

  const joinedAt = useMemo(() => parseDate(user?.createdAt), [user?.createdAt]);

  const initials = useMemo(() => {
    const parts = (user?.name ?? "User")
      .split(" ")
      .filter(Boolean)
      .slice(0, 2)
      .map((p) => p[0]?.toUpperCase())
      .join("");

    return parts || "U";
  }, [user?.name]);

  const updatePreference = (key: keyof SettingsPreferences, value: boolean) => {
    setPreferences((prev) => ({ ...prev, [key]: value }));
    setIsDirty(true);
  };

  const savePreferences = () => {
    if (typeof window === "undefined") return;

    localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(preferences));
    setIsDirty(false);

    toast.success("Settings saved", {
      description: "Your preferences were saved for this browser.",
    });
  };

  if (isLoading) {
    return (
      <div className="flex h-[60vh] flex-col items-center justify-center gap-3">
        <SpinnerGapIcon className="text-primary size-7 animate-spin" />
        <p className="text-muted-foreground text-sm">
          Loading your settings...
        </p>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex h-[60vh] items-center justify-center">
        <Card className="border-border/60 w-full max-w-md shadow-none">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <WarningCircleIcon className="text-destructive size-4" />
              Unable to load account
            </CardTitle>
            <CardDescription>
              We couldn’t fetch your profile details right now.
            </CardDescription>
          </CardHeader>
          <CardFooter>
            <Button variant="outline" onClick={() => window.location.reload()}>
              Try Again
            </Button>
          </CardFooter>
        </Card>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-6xl space-y-6 py-2">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Account Settings</h1>
        <p className="text-muted-foreground text-sm">
          Manage your account and customize your QuickLogo experience.
        </p>
      </div>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_320px]">
        <div className="space-y-6">
          <Card className="border-border/60 shadow-none">
            <CardHeader>
              <CardTitle>Personal Information</CardTitle>
              <CardDescription>
                Your profile information synced from authentication.
              </CardDescription>
            </CardHeader>

            <CardContent className="space-y-5">
              <div className="flex items-center gap-4">
                <Avatar className="border-border size-16 rounded-none border">
                  <AvatarImage
                    src={user.image ?? undefined}
                    alt={user.name}
                    className="rounded-none"
                  />
                  <AvatarFallback className="bg-primary/10 text-primary font-bold">
                    {initials}
                  </AvatarFallback>
                </Avatar>

                <div>
                  <p className="text-sm font-semibold">{user.name}</p>

                  <p className="text-muted-foreground flex items-center gap-1 text-xs">
                    {user.email}
                    <CheckCircleIcon className="size-3 text-green-500" />
                  </p>
                </div>
              </div>

              <Separator />

              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                <SettingField
                  id="settings-name"
                  label="Full Name"
                  icon={<UserCircleIcon className="size-3.5" />}
                  value={user.name}
                />

                <SettingField
                  id="settings-email"
                  label="Email Address"
                  icon={<EnvelopeSimpleIcon className="size-3.5" />}
                  value={user.email}
                />

                <SettingField
                  id="settings-joined"
                  label="Member Since"
                  icon={<CalendarBlankIcon className="size-3.5" />}
                  value={joinedAt ? format(joinedAt, "MMM d, yyyy") : "N/A"}
                />
              </div>
            </CardContent>
          </Card>

          <Card className="border-border/60 shadow-none">
            <CardHeader>
              <CardTitle>Experience Preferences</CardTitle>
              <CardDescription>
                Customize your in-app experience.
              </CardDescription>
            </CardHeader>

            <CardContent className="space-y-4">
              <PreferenceSwitch
                icon={<BellIcon className="text-primary size-4" />}
                title="Product Updates"
                description="Get notifications about major features."
                checked={preferences.productUpdates}
                onChange={(v) => updatePreference("productUpdates", v)}
              />

              <PreferenceSwitch
                icon={<LightningIcon className="text-primary size-4" />}
                title="Billing Reminders"
                description="Show credit reminders in the app."
                checked={preferences.billingReminders}
                onChange={(v) => updatePreference("billingReminders", v)}
              />

              <PreferenceSwitch
                icon={<SparkleIcon className="text-primary size-4" />}
                title="AI Prompt Tips"
                description="Show tips to improve prompts."
                checked={preferences.aiTips}
                onChange={(v) => updatePreference("aiTips", v)}
              />
            </CardContent>

            <CardFooter className="justify-between">
              <p className="text-muted-foreground text-xs">
                {isDirty ? "You have unsaved changes." : "All changes saved."}
              </p>

              <Button
                size="sm"
                className="gap-2"
                onClick={savePreferences}
                disabled={!isDirty}
              >
                <FloppyDiskIcon className="size-3.5" />
                Save Preferences
              </Button>
            </CardFooter>
          </Card>
        </div>

        <div className="space-y-6">
          <Card className="border-border/60 shadow-none">
            <CardHeader>
              <CardTitle>Quick Actions</CardTitle>
            </CardHeader>

            <CardContent className="space-y-2">
              <Link
                to="/generate"
                className={cn(
                  buttonVariants({ variant: "outline", size: "sm" }),
                  "w-full justify-between",
                )}
              >
                Start New Generation
                <ArrowSquareOutIcon className="size-3.5" />
              </Link>

              <Link
                to="/projects"
                className={cn(
                  buttonVariants({ variant: "outline", size: "sm" }),
                  "w-full justify-between",
                )}
              >
                Open Projects
                <ArrowSquareOutIcon className="size-3.5" />
              </Link>

              <Link
                to="/credits"
                className={cn(
                  buttonVariants({ variant: "outline", size: "sm" }),
                  "w-full justify-between",
                )}
              >
                Manage Billing
                <ArrowSquareOutIcon className="size-3.5" />
              </Link>
            </CardContent>

            <CardFooter>
              <Button
                variant="destructive"
                size="sm"
                className="w-full gap-2"
                disabled={isLoggingOut}
                onClick={() => logout()}
              >
                <SignOutIcon className="size-3.5" />
                {isLoggingOut ? "Signing out..." : "Sign Out"}
              </Button>
            </CardFooter>
          </Card>
        </div>
      </div>
    </div>
  );
}

function SettingField({
  id,
  label,
  icon,
  value,
}: {
  id: string;
  label: string;
  icon: React.ReactNode;
  value: string;
}) {
  return (
    <div className="space-y-1.5">
      <Label className="text-muted-foreground flex items-center gap-1 text-[11px] font-semibold uppercase">
        {icon}
        {label}
      </Label>

      <Input id={id} value={value} readOnly />
    </div>
  );
}

function PreferenceSwitch({
  icon,
  title,
  description,
  checked,
  onChange,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <div className="border-border/60 bg-muted/20 flex items-start justify-between gap-3 border p-3">
      <div className="flex gap-2.5">
        <div className="mt-0.5">{icon}</div>

        <div>
          <p className="text-sm font-medium">{title}</p>
          <p className="text-muted-foreground text-xs">{description}</p>
        </div>
      </div>

      <Switch checked={checked} onCheckedChange={onChange} />
    </div>
  );
}
