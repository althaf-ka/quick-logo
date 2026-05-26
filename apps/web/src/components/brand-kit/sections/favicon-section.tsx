import { SectionHeader, SectionContent } from "./section-header";
import { WarningCircleIcon } from "@phosphor-icons/react";
import { cn } from "@quicklogo/ui/lib/utils";

export interface FaviconSize {
  size: number;
  label: string;
  url: string;
  type?: string;
}

interface FaviconSectionProps {
  icons: FaviconSize[];
  onRefine?: (sectionId: string) => void;
  isRefining?: boolean;
}

function BrowserTabMockup({
  url,
  label,
  size,
}: {
  url: string;
  label: string;
  size: number;
}) {
  const isPlaceholder = url.includes("placehold.co");

  return (
    <div className="border-border/50 relative flex h-full flex-col rounded-none border-2 bg-transparent">
      <div className="bg-background border-border/50 flex w-full flex-col overflow-hidden rounded-none border-b-2">
        <div className="bg-muted/20 border-border/50 flex h-6 items-center gap-1.5 border-b-2 px-2">
          <div className="bg-destructive/80 size-2 rounded-none" />
          <div className="bg-warning/80 size-2 rounded-none" />
          <div className="bg-success/80 size-2 rounded-none" />
        </div>
        <div className="bg-background flex items-end px-2 pt-4">
          <div className="bg-muted/10 border-border/50 mt-auto flex w-[65%] translate-y-[2px] items-center gap-2.5 overflow-hidden rounded-none border-x-2 border-t-2 px-3 py-2">
            <img
              src={url}
              alt="Favicon"
              style={{ width: 48, height: 48, imageRendering: "pixelated" }}
              className={cn(
                "shrink-0 rounded-none",
                isPlaceholder && "opacity-40 grayscale filter",
              )}
            />
            <div className="text-foreground/80 truncate text-[10px] font-medium">
              Brand Page
            </div>
          </div>
        </div>
      </div>
      <div className="bg-muted/5 mt-auto p-3 text-center">
        <p className="font-mono text-[11px] font-bold uppercase">
          {size}×{size}
        </p>
        <p className="text-muted-foreground/60 mt-1 font-mono text-[9px] tracking-wider uppercase">
          {label}
        </p>
      </div>
      {isPlaceholder ? (
        <div className="bg-background/80 absolute inset-0 z-20 flex flex-col items-center justify-center gap-1.5 p-4 text-center backdrop-blur-sm">
          <WarningCircleIcon className="size-5 animate-pulse text-amber-500" />
          <p className="font-mono text-[10px] font-bold tracking-wider text-amber-500 uppercase">
            Generation Pending
          </p>
        </div>
      ) : null}
    </div>
  );
}

function AppMockup({
  url,
  label,
  size,
}: {
  url: string;
  label: string;
  size: number;
}) {
  const isPlaceholder = url.includes("placehold.co");

  return (
    <div className="border-border/50 relative flex h-full flex-col rounded-none border-2 bg-transparent">
      <div className="bg-muted/10 border-border/50 relative flex w-full items-center justify-center overflow-hidden rounded-none border-b-2 py-8">
        <img
          src={url}
          alt="App Icon"
          className={cn(
            "h-28 w-28 rounded-none object-contain",
            isPlaceholder && "opacity-40 grayscale filter",
          )}
        />
      </div>
      <div className="bg-muted/5 mt-auto p-3 text-center">
        <p className="font-mono text-[11px] font-bold uppercase">
          {size}×{size}
        </p>
        <p className="text-muted-foreground/60 mt-1 font-mono text-[9px] tracking-wider uppercase">
          {label}
        </p>
      </div>
      {isPlaceholder ? (
        <div className="bg-background/80 absolute inset-0 z-20 flex flex-col items-center justify-center gap-1.5 p-4 text-center backdrop-blur-sm">
          <WarningCircleIcon className="size-5 animate-pulse text-amber-500" />
          <p className="font-mono text-[10px] font-bold tracking-wider text-amber-500 uppercase">
            Generation Pending
          </p>
        </div>
      ) : null}
    </div>
  );
}

export function FaviconSection({
  icons,
  onRefine,
  isRefining,
}: FaviconSectionProps) {
  return (
    <div>
      <SectionHeader
        title="Favicon & App Icons"
        sectionId="favicon"
        onRefine={onRefine}
        isRefining={isRefining}
      />
      <SectionContent isRefining={isRefining}>
        <div className="flex flex-col gap-6">
          {/* Row 1: Web Mockups (2 columns) */}
          <div className="grid grid-cols-2 gap-4">
            {icons
              .filter(
                (icon) =>
                  icon.type === "favicon" ||
                  (!icon.type && (icon.size === 16 || icon.size === 32)),
              )
              .map((icon) => (
                <BrowserTabMockup key={`web-${icon.size}`} {...icon} />
              ))}
          </div>

          {/* Row 2: App Mockups (3 columns) */}
          <div className="grid grid-cols-3 gap-4">
            {icons
              .filter(
                (icon) =>
                  (icon.type && icon.type !== "favicon") ||
                  (!icon.type && icon.size >= 180),
              )
              .map((icon) => (
                <AppMockup key={`app-${icon.size}`} {...icon} />
              ))}
          </div>
        </div>
      </SectionContent>
    </div>
  );
}
