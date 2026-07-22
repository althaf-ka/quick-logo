import { ArrowUpRightIcon } from "@phosphor-icons/react/dist/ssr";
import { Button } from "@quicklogo/ui/components/button";
import Link from "next/link";

import { BrandMark } from "@/components/brand-mark";
import { getAppUrl } from "@/lib/site-config";

export function SiteHeader() {
  return (
    <header className="bg-background/80 sticky top-0 z-40 border-b backdrop-blur-xl">
      <div className="mx-auto flex h-20 max-w-6xl items-center justify-between px-5 lg:px-8">
        <Link
          href="/"
          aria-label="QuickLogo home"
          className="focus-visible:ring-ring outline-none focus-visible:ring-2"
        >
          <BrandMark priority className="h-12" />
        </Link>

        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            className="hidden sm:inline-flex"
            nativeButton={false}
            render={<a href={getAppUrl("/login")} />}
          >
            Log In
          </Button>
          <Button
            size="sm"
            nativeButton={false}
            render={<a href={getAppUrl("/generate")} />}
          >
            <span className="hidden sm:inline">Open Studio</span>
            <span className="sm:hidden">Studio</span>
            <ArrowUpRightIcon data-icon="inline-end" aria-hidden="true" />
          </Button>
        </div>
      </div>
    </header>
  );
}
