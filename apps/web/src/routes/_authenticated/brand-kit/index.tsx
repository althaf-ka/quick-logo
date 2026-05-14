import { createFileRoute, Link } from "@tanstack/react-router";
import { SwatchesIcon, PlusIcon } from "@phosphor-icons/react";
import { buttonVariants } from "@quicklogo/ui/components/button";
import { cn } from "@quicklogo/ui/lib/utils";

export const Route = createFileRoute("/_authenticated/brand-kit/")({
  component: BrandKitIndexPage,
  head: () => ({
    meta: [
      { title: "Brand Kits | QuickLogo" },
      {
        name: "description",
        content: "View and manage your generated brand kits.",
      },
    ],
  }),
});

function BrandKitIndexPage() {
  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6">
      <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-mono text-xl font-black tracking-tight">
            Brand Kits
          </h1>
          <p className="text-muted-foreground/60 mt-1 font-mono text-[11px] tracking-wide">
            Your generated professional brand identities
          </p>
        </div>
        <Link
          to="/brand-kit/create"
          className={cn(
            buttonVariants(),
            "rounded-none font-mono text-[11px] font-black tracking-widest uppercase",
          )}
        >
          <PlusIcon weight="bold" className="mr-2 size-3.5" />
          Create Brand Kit
        </Link>
      </div>

      <div className="border-border/40 flex min-h-[360px] flex-col items-center justify-center border border-dashed p-12 text-center">
        <div className="bg-muted/30 mb-4 rounded-full p-4">
          <SwatchesIcon
            weight="duotone"
            className="text-muted-foreground/40 size-10"
          />
        </div>
        <p className="font-mono text-xs font-black tracking-widest uppercase">
          No brand kits yet
        </p>
        <p className="text-muted-foreground/40 mt-1.5 max-w-md font-mono text-[10px] tracking-wide">
          Create your first brand kit by uploading a logo or choosing an
          existing logo generated from QuickLogo. We'll generate color palettes,
          typography guidelines, and social media assets.
        </p>
        <Link
          to="/brand-kit/create"
          className={cn(
            buttonVariants({ variant: "outline" }),
            "mt-6 rounded-none font-mono text-[10px] font-black tracking-widest uppercase",
          )}
        >
          Get Started
        </Link>
      </div>
    </div>
  );
}
