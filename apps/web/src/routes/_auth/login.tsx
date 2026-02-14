import { FeatureCarousel } from "@/components/auth/feature-carousel";
import { GoogleIcon } from "@/components/icons";
import { Button } from "@quicklogo/ui/components/button";
import { Link, createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/_auth/login")({
  component: LoginPage,
  head: () => ({
    meta: [
      { title: "Login | QuickLogo" },
      { name: "description", content: "Securely login to your account." },
    ],
  }),
});

function LoginPage() {
  return (
    <div className="mx-auto flex w-full max-w-[360px] flex-col items-center">
      <FeatureCarousel />

      <div className="w-full space-y-6">
        <Button
          variant="outline"
          className="border-input bg-background text-foreground hover:bg-accent hover:text-accent-foreground h-12 w-full cursor-pointer rounded-none border text-[15px] font-medium shadow-sm transition-all duration-200 hover:shadow-md"
          onClick={() => console.log("Google Login")}
        >
          <GoogleIcon />
          Continue with Google
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
