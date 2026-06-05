import { SectionHeader, SectionContent } from "./section-header";
import { WarningCircleIcon } from "@phosphor-icons/react";
import { cn } from "@quicklogo/ui/lib/utils";
import { ZoomableImage } from "@/components/global/zoomable-image";
import { Button } from "@quicklogo/ui/components/button";
import { DownloadSimpleIcon } from "@phosphor-icons/react";
import { downloadImage } from "@/lib/download";
export interface FaviconSize {
  size: number;
  label: string;
  url: string;
  type?: string;
}

interface FaviconSectionProps {
  icons: FaviconSize[];
  brandName?: string;
}

function CombinedBrowserTabMockup({
  icons,
  brandName,
}: {
  icons: FaviconSize[];
  brandName?: string;
}) {
  if (!icons.length) return null;
  // Use highest res for display
  const displayIcon = [...icons].sort((a, b) => b.size - a.size)[0];
  const isPlaceholder = displayIcon.url.includes("placehold.co");

  return (
    <div className="border-border/50 relative flex h-full flex-col rounded-none border-2 bg-transparent md:flex-row">
      <div className="bg-background border-border/50 flex w-full shrink-0 flex-col overflow-hidden rounded-none border-b-2 md:w-[55%] md:border-r-2 md:border-b-0">
        <div className="bg-muted/20 border-border/50 flex h-6 shrink-0 items-center gap-1.5 border-b-2 px-2">
          <div className="bg-destructive/80 size-2 rounded-none" />
          <div className="bg-warning/80 size-2 rounded-none" />
          <div className="bg-success/80 size-2 rounded-none" />
        </div>
        <div className="bg-background flex flex-1 items-end px-4 pt-6">
          <div className="bg-muted/10 border-border/50 mt-auto flex w-full translate-y-[2px] items-center gap-3 overflow-hidden rounded-none border-x-2 border-t-2 px-4 py-3">
            <div className="flex shrink-0 items-center justify-center">
              <ZoomableImage
                src={displayIcon.url}
                alt="Favicon"
                style={{ width: 48, height: 48, objectFit: "contain" }}
                className={cn(
                  "drop-shadow-md",
                  isPlaceholder && "opacity-40 grayscale filter",
                )}
              />
            </div>
            <div className="text-foreground/90 truncate text-xs font-semibold tracking-wide">
              {brandName || "Brand Page"}
            </div>
          </div>
        </div>
      </div>
      <div className="bg-muted/5 flex w-full shrink-0 flex-col justify-center divide-y divide-white/[0.06] md:w-[45%]">
        {icons
          .sort((a, b) => a.size - b.size)
          .map((icon) => (
            <div
              key={icon.size}
              className="flex flex-1 items-center justify-between px-4 py-2.5"
            >
              <div className="text-left">
                <p className="font-mono text-[10px] font-bold uppercase">
                  {icon.size}×{icon.size}
                </p>
                <p className="text-muted-foreground/60 mt-0.5 font-mono text-[8px] tracking-wider uppercase">
                  {icon.label}
                </p>
              </div>
              <Button
                variant="ghost"
                size="sm"
                className="text-muted-foreground/40 hover:text-primary hover:bg-primary/10 h-6 w-6 cursor-pointer p-0 transition-colors"
                onClick={() =>
                  downloadImage(icon.url, `favicon-${icon.size}.png`)
                }
                title={`Download ${icon.size}x${icon.size}`}
              >
                <DownloadSimpleIcon className="size-3.5" />
                <span className="sr-only">Download</span>
              </Button>
            </div>
          ))}
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

function CombinedAppMockup({ icons }: { icons: FaviconSize[] }) {
  if (!icons.length) return null;
  // Use the highest resolution for display
  const displayIcon = [...icons].sort((a, b) => b.size - a.size)[0];
  const isPlaceholder = displayIcon.url.includes("placehold.co");

  return (
    <div className="border-border/50 relative flex h-full flex-col rounded-none border-2 bg-transparent md:flex-row">
      <div className="bg-muted/10 border-border/50 relative flex w-full shrink-0 items-center justify-center overflow-hidden rounded-none border-b-2 py-4 md:w-[55%] md:border-r-2 md:border-b-0 md:py-6">
        <ZoomableImage
          src={displayIcon.url}
          alt="App Icon"
          className={cn(
            "h-36 w-36 rounded-none object-contain drop-shadow-sm",
            isPlaceholder && "opacity-40 grayscale filter",
          )}
        />
      </div>
      <div className="bg-muted/5 flex w-full shrink-0 flex-col justify-center divide-y divide-white/[0.06] md:w-[45%]">
        {icons
          .sort((a, b) => a.size - b.size)
          .map((icon) => (
            <div
              key={icon.size}
              className="flex flex-1 items-center justify-between px-4 py-2.5"
            >
              <div className="text-left">
                <p className="font-mono text-[10px] font-bold uppercase">
                  {icon.size}×{icon.size}
                </p>
                <p className="text-muted-foreground/60 mt-0.5 font-mono text-[8px] tracking-wider uppercase">
                  {icon.label}
                </p>
              </div>
              <Button
                variant="ghost"
                size="sm"
                className="text-muted-foreground/40 hover:text-primary hover:bg-primary/10 h-6 w-6 cursor-pointer p-0 transition-colors"
                onClick={() =>
                  downloadImage(icon.url, `app-icon-${icon.size}.png`)
                }
                title={`Download ${icon.size}x${icon.size}`}
              >
                <DownloadSimpleIcon className="size-3.5" />
                <span className="sr-only">Download</span>
              </Button>
            </div>
          ))}
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

export function FaviconSection({ icons, brandName }: FaviconSectionProps) {
  return (
    <div>
      <SectionHeader title="Favicon & App Icons" sectionId="favicon" />
      <SectionContent sectionId="favicon">
        <div className="grid grid-cols-1 gap-6">
          {(() => {
            const webIcons = icons.filter(
              (icon) =>
                icon.type === "favicon" ||
                (!icon.type && (icon.size === 16 || icon.size === 32)),
            );
            return webIcons.length > 0 ? (
              <CombinedBrowserTabMockup
                icons={webIcons}
                brandName={brandName}
              />
            ) : null;
          })()}

          {(() => {
            const appIcons = icons.filter(
              (icon) =>
                (icon.type && icon.type !== "favicon") ||
                (!icon.type && icon.size >= 180),
            );
            return appIcons.length > 0 ? (
              <CombinedAppMockup icons={appIcons} />
            ) : null;
          })()}
        </div>
      </SectionContent>
    </div>
  );
}
