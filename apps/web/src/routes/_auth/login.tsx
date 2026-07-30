import { FeatureCarousel } from "@/components/auth/feature-carousel";
import { GoogleIcon } from "@/components/icons/google-icon";
import { Button } from "@quicklogo/ui/components/button";
import { Link, createFileRoute } from "@tanstack/react-router";
import { useGoogleLogin } from "@/hooks/use-auth";
import { Spinner } from "@quicklogo/ui/components/spinner";
import { toast } from "@quicklogo/ui/components/sonner";
import { useRouter } from "@tanstack/react-router";
import { useEffect } from "react";
import { readSearchString } from "@/lib/search-params";

export const Route = createFileRoute("/_auth/login")({
  head: () => ({
    meta: [
      { title: "Login | QuickLogo" },
      { name: "description", content: "Securely login to your account." },
    ],
  }),

  validateSearch: (
    search,
  ): {
    redirect?: string;
    error?: string;
    error_description?: string;
  } => ({
    redirect: readSearchString(search.redirect) ?? "",
    error: readSearchString(search.error) ?? "",
    error_description: readSearchString(search.error_description) ?? "",
  }),

  component: LoginPage,
});

function LoginPage() {
  const { mutate: login, isPending } = useGoogleLogin();
  const { redirect, error, error_description } = Route.useSearch();
  const router = useRouter();

  useEffect(() => {
    if (error) {
      toast.error(error_description || "Authentication failed", {
        id: "auth-error",
      });
      router.navigate({
        to: "/login",
        search: { redirect },
        replace: true,
      });
    }
  }, [error, error_description, redirect, router]);

  const handleLogin = () => {
    login({ redirect: redirect || "/generate" });
  };

  return (
    <div className="mx-auto flex w-full max-w-[360px] flex-col items-center">
      <FeatureCarousel />

      <div className="w-full space-y-6">
        <Button
          variant="outline"
          className="border-input bg-background text-foreground hover:bg-accent hover:text-accent-foreground h-12 w-full cursor-pointer rounded-none border text-[15px] font-medium shadow-sm transition-all duration-200 hover:shadow-md disabled:cursor-not-allowed disabled:opacity-50"
          onClick={handleLogin}
          disabled={isPending}
        >
          {isPending ? (
            <Spinner className="mr-2" aria-hidden="true" />
          ) : (
            <GoogleIcon className="mr-2" />
          )}

          {isPending ? "Authenticating..." : "Continue with Google"}
        </Button>

        <div className="text-center">
          <span className="text-muted-foreground text-xs">
            New to QuickLogo?{" "}
          </span>
          <Link
            to="/register"
            viewTransition
            className="text-foreground text-xs font-semibold underline-offset-4 hover:underline"
          >
            Create an account
          </Link>
        </div>
      </div>
    </div>
  );
}
