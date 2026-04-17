import { createFileRoute } from "@tanstack/react-router";
import { Button } from "@quicklogo/ui/components/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@quicklogo/ui/components/card";
import { useLogout } from "@/hooks/use-auth";
import { ShieldWarningIcon } from "@phosphor-icons/react";

export const Route = createFileRoute("/_auth/access-denied")({
  component: AccessDeniedPage,
});

function AccessDeniedPage() {
  const logout = useLogout();

  return (
    <Card className="border-destructive/50">
      <CardHeader className="text-center">
        <div className="bg-destructive/10 mx-auto mb-4 flex size-12 items-center justify-center rounded-full">
          <ShieldWarningIcon
            className="text-destructive size-6"
            weight="fill"
          />
        </div>
        <CardTitle>Access Denied</CardTitle>
        <CardDescription>
          Your account does not have administrative privileges.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <p className="text-muted-foreground mb-6 text-center text-sm">
          If you believe this is an error, please contact your system
          administrator to request access.
        </p>
        <Button
          className="w-full cursor-pointer"
          size="lg"
          variant="secondary"
          onClick={() => logout.mutate()}
          disabled={logout.isPending}
        >
          {logout.isPending ? "Signing out…" : "Sign out"}
        </Button>
      </CardContent>
    </Card>
  );
}
