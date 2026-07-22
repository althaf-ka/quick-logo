import { ArrowRightIcon } from "@phosphor-icons/react/dist/ssr";
import { Button } from "@quicklogo/ui/components/button";
import Link from "next/link";

import { BrandMark } from "@/components/brand-mark";
import { getAppUrl } from "@/lib/site-config";

export function SiteFooter() {
  return (
    <footer>
      <div className="mx-auto max-w-6xl px-5 lg:px-8">
        <div className="grid gap-10 py-20 md:grid-cols-[1fr_auto] md:items-end lg:py-28">
          <div className="flex max-w-3xl flex-col gap-5">
            <p className="text-primary text-xs font-medium tracking-[0.18em] uppercase">
              Your Next Identity
            </p>
            <h2 className="text-4xl leading-[1.05] font-semibold tracking-[-0.05em] text-balance sm:text-6xl">
              Make the Next Idea Recognizable.
            </h2>
            <p className="text-muted-foreground max-w-xl text-sm leading-6">
              Begin with a description. Leave with a visual system built to work
              wherever your brand shows up.
            </p>
          </div>

          <Button
            size="lg"
            nativeButton={false}
            render={<a href={getAppUrl("/generate")} />}
          >
            Open Studio
            <ArrowRightIcon data-icon="inline-end" aria-hidden="true" />
          </Button>
        </div>

        <div className="flex flex-col gap-5 border-t py-6 sm:flex-row sm:items-center sm:justify-between">
          <Link
            href="/"
            aria-label="QuickLogo home"
            className="focus-visible:ring-ring outline-none focus-visible:ring-2"
          >
            <BrandMark className="h-10" />
          </Link>
          <div className="text-muted-foreground flex flex-col gap-1 text-[10px] sm:items-end">
            <p>Distinctive identities, built at the speed of an idea.</p>
            <p>© {new Date().getFullYear()} QuickLogo</p>
          </div>
        </div>
      </div>
    </footer>
  );
}
