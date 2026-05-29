import { useMemo } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { SwatchesIcon, PlusIcon } from "@phosphor-icons/react";
import { buttonVariants } from "@quicklogo/ui/components/button";
import { cn } from "@quicklogo/ui/lib/utils";
import { InfiniteScrollObserver } from "@/components/global/infinite-scroll-observer";
import {
  PageEmptyState,
  PageErrorState,
} from "@/components/global/page-states";
import { useBrandKits } from "../../../hooks/brand-kit/use-brand-kits";
import { BrandKitCard } from "./-components/brand-kit-card";

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
  const { data, fetchNextPage, hasNextPage, isFetchingNextPage, status } =
    useBrandKits();

  const brandKits = useMemo(
    () => data?.pages.flatMap((p) => p.items) ?? [],
    [data],
  );

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6">
      <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-mono text-xl font-black tracking-tight">
            Brand Kits
          </h1>
          <p className="text-muted-foreground/60 mt-1 font-mono text-[11px] tracking-wide">
            Your generated professional brand identities{" "}
            {brandKits.length > 0 ? `(${brandKits.length})` : ""}
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

      {status === "pending" ? (
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="h-[180px] animate-pulse border border-white/[0.04] bg-zinc-950/20"
            />
          ))}
        </div>
      ) : status === "error" ? (
        <PageErrorState />
      ) : brandKits.length === 0 ? (
        <PageEmptyState
          icon={
            <SwatchesIcon
              weight="duotone"
              className="text-muted-foreground/40 size-10"
            />
          }
          title="No brand kits yet"
          description="Create your first brand kit by uploading a logo or choosing an existing logo generated from QuickLogo. We'll generate color palettes, typography guidelines, and social media assets."
          action={
            <Link
              to="/brand-kit/create"
              className={cn(
                buttonVariants({ variant: "outline" }),
                "rounded-none font-mono text-[10px] font-black tracking-widest uppercase",
              )}
            >
              Get Started
            </Link>
          }
        />
      ) : (
        <>
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
            {brandKits.map((kit) => (
              <BrandKitCard key={kit.id} kit={kit} />
            ))}
          </div>

          <InfiniteScrollObserver
            hasNextPage={hasNextPage}
            isFetchingNextPage={isFetchingNextPage}
            fetchNextPage={fetchNextPage}
            hasItems={brandKits.length > 0}
          />
        </>
      )}
    </div>
  );
}
