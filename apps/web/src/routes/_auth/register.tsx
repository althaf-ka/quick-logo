import { createFileRoute, Link } from "@tanstack/react-router";
import { Button } from "@quicklogo/ui/components/button";
import { FeatureCarousel } from "@/components/auth/feature-carousel";
import { GoogleIcon } from "@/components/icons";

export const Route = createFileRoute("/_auth/register")({
  component: RegisterPage,
  head: () => ({
    meta: [
      { title: "Register | QuickLogo" },
      { name: "description", content: "Securely create your account." },
    ],
  }),
});

function RegisterPage() {
  return (
    <div className="mx-auto flex w-full max-w-[360px] flex-col items-center">
      <FeatureCarousel />

      <div className="w-full space-y-4">
        <Button
          variant="outline"
          className="border-input bg-background text-foreground hover:bg-accent hover:text-accent-foreground h-12 w-full cursor-pointer rounded-none border text-[15px] font-medium shadow-sm transition-all duration-200 hover:shadow-md"
          onClick={() => console.log("Google Signup")}
        >
          <GoogleIcon />
          Sign up with Google
        </Button>

        <p className="text-muted-foreground text-center text-[11px]">
          By joining, you agree to our
          <span className="text-foreground mx-1 font-medium hover:underline">
            Terms
          </span>
          &
          <span className="text-foreground ml-1 font-medium hover:underline">
            Privacy Policy
          </span>
          .
        </p>

        <div className="border-t pt-2 text-center">
          <span className="text-muted-foreground text-xs">
            Already have an account?{" "}
          </span>
          <Link
            to="/login"
            viewTransition
            className="text-foreground text-xs font-semibold underline-offset-4 hover:underline"
          >
            Log in
          </Link>
        </div>
      </div>
    </div>
  );
}
