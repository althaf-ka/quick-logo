import { useGoogleLogin } from "@/hooks/use-auth";
import { createFileRoute } from "@tanstack/react-router";
import { Button } from "@quicklogo/ui/components/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@quicklogo/ui/components/card";

interface LoginSearch {
  redirect?: string;
}

export const Route = createFileRoute("/_auth/login")({
  validateSearch: (search: Record<string, unknown>): LoginSearch => ({
    redirect: typeof search.redirect === "string" ? search.redirect : undefined,
  }),
  component: LoginPage,
});

function LoginPage() {
  const { redirect } = Route.useSearch();
  const googleLogin = useGoogleLogin();

  return (
    <Card>
      <CardHeader className="text-center">
        <CardTitle>Welcome back</CardTitle>
        <CardDescription>
          Sign in with your Google account to continue
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Button
          className="w-full cursor-pointer"
          size="lg"
          onClick={() => googleLogin.mutate({ redirect })}
          disabled={googleLogin.isPending}
        >
          {googleLogin.isPending ? "Signing in…" : "Continue with Google"}
        </Button>
      </CardContent>
    </Card>
  );
}
