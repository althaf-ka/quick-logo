import { SectionHeader, SectionContent } from "./section-header";
import { cn } from "@quicklogo/ui/lib/utils";
import { downloadImage } from "@/lib/download";
import { ZoomableImage } from "@/components/global/zoomable-image";
import { Button } from "@quicklogo/ui/components/button";
import {
  InstagramLogoIcon,
  XLogoIcon,
  LinkedinLogoIcon,
  FacebookLogoIcon,
  YoutubeLogoIcon,
  GlobeIcon,
  DownloadSimpleIcon,
  WarningCircleIcon,
  SparkleIcon,
} from "@phosphor-icons/react";
import { getSocialAssetTargetId } from "@quicklogo/shared";

export interface SocialMediaAsset {
  platform: string;
  type: string;
  dimensions: string;
  url: string;
}

interface SocialMediaSectionProps {
  assets: SocialMediaAsset[];
  onRefine?: (sectionId: string, targetItemId?: string) => void;
  isRefining?: boolean;
  refiningItemId?: string | null;
}

function PlatformIcon({ platform }: { platform: string }) {
  switch (platform.toLowerCase()) {
    case "instagram":
      return <InstagramLogoIcon className="size-3.5 text-pink-500" />;
    case "twitter":
    case "x":
      return <XLogoIcon className="text-foreground size-3.5" />;
    case "linkedin":
      return <LinkedinLogoIcon className="size-3.5 text-blue-600" />;
    case "facebook":
      return <FacebookLogoIcon className="size-3.5 text-blue-500" />;
    case "youtube":
      return <YoutubeLogoIcon className="size-3.5 text-red-500" />;
    default:
      return <GlobeIcon className="text-muted-foreground size-3.5" />;
  }
}

function getRatioLabel(asset: SocialMediaAsset): string {
  if (asset.type === "Profile") return "1:1 Ratio";
  if (asset.dimensions === "1500x500") return "3:1 Ratio";
  if (asset.dimensions === "1584x396") return "4:1 Ratio";
  if (asset.dimensions === "820x360") return "16:7 Ratio";
  if (asset.dimensions === "2560x1440") return "16:9 Ratio";
  const parts = asset.dimensions.split("x").map(Number);
  if (parts.length === 2 && parts[0] > 0 && parts[1] > 0) {
    const gcd = (a: number, b: number): number => (b === 0 ? a : gcd(b, a % b));
    const divisor = gcd(parts[0], parts[1]);
    return `${parts[0] / divisor}:${parts[1] / divisor} Ratio`;
  }
  return "Banner Ratio";
}

export function SocialMediaSection({
  assets,
  onRefine,
  isRefining,
  refiningItemId,
}: SocialMediaSectionProps) {
  // Sort assets so Profile is first, followed by Facebook banner to sit next to it
  const displayAssets = [...assets].sort((a, b) => {
    if (a.type === "Profile") return -1;
    if (b.type === "Profile") return 1;
    if (a.platform === "Facebook") return -1;
    if (b.platform === "Facebook") return 1;
    return 0;
  });

  return (
    <div>
      <SectionHeader
        title="Social Media Kit"
        sectionId="social-media"
        onRefine={onRefine}
        isRefining={isRefining}
      />
      <SectionContent isRefining={isRefining && !refiningItemId}>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          {displayAssets.map((asset, i) => {
            const isProfile = asset.type === "Profile";
            // Place the very first banner next to the profile to fill the row perfectly
            const isFirstBanner = !isProfile && i === 1;
            const isPlaceholder = asset.url.includes("placehold.co");

            const colSpan = isProfile
              ? "col-span-1"
              : isFirstBanner
                ? "col-span-1 sm:col-span-2"
                : "col-span-1 sm:col-span-3";

            return (
              <div
                key={i}
                className={cn(
                  "group border-border/50 hover:border-primary/40 bg-card flex flex-col overflow-hidden border transition-colors",
                  colSpan,
                )}
              >
                <div className="bg-muted/10 relative flex w-full flex-1 items-center justify-center overflow-hidden">
                  <div
                    className={cn(
                      "relative w-full overflow-hidden",
                      isProfile
                        ? "aspect-square"
                        : isFirstBanner
                          ? "aspect-[21/9] sm:absolute sm:inset-0 sm:aspect-auto"
                          : "aspect-[21/9] sm:aspect-[4/1]",
                    )}
                  >
                    <SectionContent
                      isRefining={
                        isRefining &&
                        refiningItemId === getSocialAssetTargetId(asset)
                      }
                      className="pointer-events-none absolute inset-0 z-30"
                    />
                    <ZoomableImage
                      src={asset.url}
                      alt={
                        isProfile
                          ? "Profile Picture"
                          : `${asset.platform} ${asset.type}`
                      }
                      className={cn(
                        "absolute inset-0 z-10 h-full w-full cursor-pointer object-cover object-center transition-transform duration-300 group-hover:scale-[1.01]",
                        isPlaceholder && "opacity-40 grayscale filter",
                      )}
                    />
                    {isPlaceholder ? (
                      <div className="bg-background/80 absolute inset-0 z-20 flex flex-col items-center justify-center gap-1.5 p-4 text-center backdrop-blur-sm">
                        <WarningCircleIcon className="size-5 animate-pulse text-amber-500" />
                        <p className="font-mono text-[10px] font-bold tracking-wider text-amber-500 uppercase">
                          Generation Pending
                        </p>
                        <p className="text-muted-foreground max-w-[180px] font-mono text-[8px]">
                          AI asset generation is queued or encountered an issue.
                        </p>
                      </div>
                    ) : (
                      <div className="pointer-events-none absolute top-2 right-2 z-40 flex items-center gap-1.5 opacity-0 transition-opacity duration-200 group-hover:opacity-100">
                        <Button
                          variant="secondary"
                          size="sm"
                          className="bg-background/80 hover:bg-background pointer-events-auto h-8 w-8 rounded-none p-0 shadow-sm backdrop-blur-md transition-all hover:scale-105"
                          onClick={(e) => {
                            e.stopPropagation();
                            onRefine?.(
                              "social-media",
                              getSocialAssetTargetId(asset),
                            );
                          }}
                          title={`Refine ${asset.platform} ${asset.type}`}
                        >
                          <SparkleIcon className="text-primary size-4" />
                          <span className="sr-only">Refine</span>
                        </Button>
                        <Button
                          variant="secondary"
                          size="sm"
                          className="bg-background/80 hover:bg-background pointer-events-auto h-8 w-8 rounded-none p-0 shadow-sm backdrop-blur-md transition-all hover:scale-105"
                          onClick={(e) => {
                            e.stopPropagation();
                            downloadImage(
                              asset.url,
                              `${asset.platform.toLowerCase()}-${asset.type.toLowerCase()}.png`,
                            );
                          }}
                          title={`Download ${asset.platform} ${asset.type}`}
                        >
                          <DownloadSimpleIcon className="size-4" />
                          <span className="sr-only">Download</span>
                        </Button>
                      </div>
                    )}
                  </div>
                </div>
                <div className="bg-muted/5 flex w-full shrink-0 items-center justify-between border-t px-4 py-2.5">
                  <div className="flex items-center gap-2.5">
                    <PlatformIcon platform={asset.platform} />
                    <div>
                      <p className="font-mono text-[10px] leading-none font-bold uppercase">
                        {isProfile
                          ? "Profile Picture"
                          : `${asset.platform} ${asset.type}`}
                      </p>
                      <p className="text-muted-foreground mt-1 font-mono text-[9px] leading-none tracking-wider uppercase">
                        {getRatioLabel(asset)}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    <span className="text-muted-foreground/40 mr-1 font-mono text-[8px]">
                      {asset.dimensions}
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </SectionContent>
    </div>
  );
}
