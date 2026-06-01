import { SectionHeader, SectionContent } from "./section-header";
import { Button } from "@quicklogo/ui/components/button";
import { DownloadSimpleIcon, SparkleIcon } from "@phosphor-icons/react";
import { downloadImage } from "@/lib/download";
import { ZoomableImage } from "@/components/global/zoomable-image";

interface BrandedBackdropsSectionProps {
  data: {
    feedUrl: string;
    storyUrl: string;
  };
  onRefine?: (sectionId: string, targetItemId?: string) => void;
  isRefining?: boolean;
  refiningItemId?: string | null;
}

export function BrandedBackdropsSection({
  data,
  onRefine,
  isRefining,
  refiningItemId,
}: BrandedBackdropsSectionProps) {
  return (
    <div>
      <SectionHeader
        title="Branded Backdrops"
        sectionId="branded-backdrops"
        onRefine={onRefine}
        isRefining={isRefining}
      />
      <SectionContent isRefining={isRefining && !refiningItemId}>
        <div className="grid gap-6 sm:grid-cols-2">
          <div className="border-border/50 relative flex flex-col rounded-none border-2 bg-transparent">
            <div className="bg-muted/10 border-border/50 relative flex w-full flex-1 items-center justify-center border-b-2 p-6 sm:p-8">
              <div className="relative w-full max-w-[360px] overflow-hidden rounded-none shadow-2xl ring-1 ring-white/10 transition-transform duration-500 hover:scale-105">
                <SectionContent isRefining={isRefining && refiningItemId === "feed"} className="absolute inset-0 z-30" />
                <div className="aspect-square w-full">
                  <ZoomableImage
                    src={data.feedUrl}
                    alt="Instagram/LinkedIn Feed Backdrop"
                    className="absolute inset-0 h-full w-full object-cover"
                  />
                  <div className="absolute inset-0 bg-zinc-950/60 opacity-0 hover:opacity-100 flex items-center justify-center transition-opacity z-20 backdrop-blur-sm">
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => onRefine?.("branded-backdrops", "feed")}
                    >
                      <SparkleIcon weight="fill" className="size-4 mr-2 text-primary" /> Refine Asset
                    </Button>
                  </div>
                </div>
              </div>
            </div>
            <div className="bg-muted/5 flex items-center justify-between px-4 py-3">
              <div className="text-left">
                <p className="font-mono text-[10px] font-bold uppercase">
                  Feed Backdrop
                </p>
                <p className="text-muted-foreground/60 mt-0.5 font-mono text-[8px] tracking-wider uppercase">
                  1:1 Ratio
                </p>
              </div>
              <Button
                variant="ghost"
                size="sm"
                className="text-muted-foreground/40 hover:bg-primary/10 hover:text-primary h-6 w-6 cursor-pointer p-0 transition-colors"
                onClick={() => downloadImage(data.feedUrl, "feed-backdrop.png")}
                title="Download 1080x1080"
              >
                <DownloadSimpleIcon className="size-3.5" />
                <span className="sr-only">Download</span>
              </Button>
            </div>
          </div>
          <div className="border-border/50 relative flex flex-col rounded-none border-2 bg-transparent">
            <div className="bg-muted/10 border-border/50 relative flex w-full flex-1 items-center justify-center border-b-2 p-6 sm:p-8">
              <div className="relative w-full max-w-[280px] overflow-hidden rounded-none shadow-2xl ring-1 ring-white/10 transition-transform duration-500 hover:scale-105">
                <SectionContent isRefining={isRefining && refiningItemId === "story"} className="absolute inset-0 z-30" />
                <div className="aspect-[9/16] w-full">
                  <ZoomableImage
                    src={data.storyUrl}
                    alt="Instagram/TikTok Story Backdrop"
                    className="absolute inset-0 h-full w-full object-cover"
                  />
                  <div className="absolute inset-0 bg-zinc-950/60 opacity-0 hover:opacity-100 flex items-center justify-center transition-opacity z-20 backdrop-blur-sm">
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => onRefine?.("branded-backdrops", "story")}
                    >
                      <SparkleIcon weight="fill" className="size-4 mr-2 text-primary" /> Refine Asset
                    </Button>
                  </div>
                </div>
              </div>
            </div>
            <div className="bg-muted/5 flex items-center justify-between px-4 py-3">
              <div className="text-left">
                <p className="font-mono text-[10px] font-bold uppercase">
                  Story Backdrop
                </p>
                <p className="text-muted-foreground/60 mt-0.5 font-mono text-[8px] tracking-wider uppercase">
                  9:16 Ratio
                </p>
              </div>
              <Button
                variant="ghost"
                size="sm"
                className="text-muted-foreground/40 hover:bg-primary/10 hover:text-primary h-6 w-6 cursor-pointer p-0 transition-colors"
                onClick={() => downloadImage(data.storyUrl, "story-backdrop.png")}
                title="Download 1080x1920"
              >
                <DownloadSimpleIcon className="size-3.5" />
                <span className="sr-only">Download</span>
              </Button>
            </div>
          </div>
        </div>
      </SectionContent>
    </div>
  );
}
