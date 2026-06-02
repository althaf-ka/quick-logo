import { SectionHeader, SectionContent } from "./section-header";
import { downloadImage } from "@/lib/download";
import { ZoomableImage } from "@/components/global/zoomable-image";
import { Button } from "@quicklogo/ui/components/button";
import { DownloadSimpleIcon, SparkleIcon } from "@phosphor-icons/react";

export interface BusinessCardData {
  frontUrl: string;
  backUrl?: string;
}

interface BusinessCardSectionProps {
  card: BusinessCardData;
  onRefine?: (sectionId: string, targetItemId?: string) => void;
  isRefining?: boolean;
  refiningItemId?: string | null;
}

export function BusinessCardSection({
  card,
  onRefine,
  isRefining,
  refiningItemId,
}: BusinessCardSectionProps) {
  return (
    <div>
      <SectionHeader
        title="Business Card"
        sectionId="business-card"
        onRefine={onRefine}
        isRefining={isRefining}
      />
      <SectionContent isRefining={isRefining && !refiningItemId}>
        <div className="grid gap-4 md:grid-cols-2">
          <div className="group border-border/50 hover:border-primary/40 bg-card flex flex-col overflow-hidden border transition-colors">
            <div className="bg-muted/10 relative flex aspect-[16/9] w-full flex-1 items-center justify-center overflow-hidden">
              <SectionContent
                isRefining={isRefining && refiningItemId === "front"}
                className="pointer-events-none absolute inset-0 z-30"
              />
              <ZoomableImage
                src={card.frontUrl}
                alt="Business Card — Front"
                className="h-full w-full cursor-pointer object-cover transition-transform duration-300 group-hover:scale-[1.01]"
              />
              <div className="pointer-events-none absolute top-3 right-3 z-40 flex items-center gap-1.5 opacity-0 transition-opacity duration-200 group-hover:opacity-100">
                <Button
                  variant="secondary"
                  size="sm"
                  className="bg-background/80 hover:bg-background pointer-events-auto h-8 w-8 rounded-none p-0 shadow-sm backdrop-blur-md transition-all hover:scale-105"
                  onClick={(e) => {
                    e.stopPropagation();
                    onRefine?.("business-card", "front");
                  }}
                  title="Refine Front"
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
                    downloadImage(card.frontUrl, "business-card-front.png");
                  }}
                  title="Download Front"
                >
                  <DownloadSimpleIcon className="size-4" />
                  <span className="sr-only">Download</span>
                </Button>
              </div>
            </div>
            <div className="bg-muted/5 flex w-full shrink-0 items-center justify-between border-t px-4 py-2.5">
              <span className="text-muted-foreground font-mono text-[9px] tracking-wider uppercase">
                Front
              </span>
              <span className="text-muted-foreground/40 font-mono text-[8px]">
                1376x768
              </span>
            </div>
          </div>

          {card.backUrl ? (
            <div className="group border-border/50 hover:border-primary/40 bg-card flex flex-col overflow-hidden border transition-colors">
              <div className="bg-muted/10 relative flex aspect-[16/9] w-full flex-1 items-center justify-center overflow-hidden">
                <SectionContent
                  isRefining={isRefining && refiningItemId === "back"}
                  className="pointer-events-none absolute inset-0 z-30"
                />
                <ZoomableImage
                  src={card.backUrl}
                  alt="Business Card — Back"
                  className="h-full w-full cursor-pointer object-cover transition-transform duration-300 group-hover:scale-[1.01]"
                />
                <div className="pointer-events-none absolute top-3 right-3 z-40 flex items-center gap-1.5 opacity-0 transition-opacity duration-200 group-hover:opacity-100">
                  <Button
                    variant="secondary"
                    size="sm"
                    className="bg-background/80 hover:bg-background pointer-events-auto h-8 w-8 rounded-none p-0 shadow-sm backdrop-blur-md transition-all hover:scale-105"
                    onClick={(e) => {
                      e.stopPropagation();
                      onRefine?.("business-card", "back");
                    }}
                    title="Refine Back"
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
                      downloadImage(card.backUrl!, "business-card-back.png");
                    }}
                    title="Download Back"
                  >
                    <DownloadSimpleIcon className="size-4" />
                    <span className="sr-only">Download</span>
                  </Button>
                </div>
              </div>
              <div className="bg-muted/5 flex w-full shrink-0 items-center justify-between border-t px-4 py-2.5">
                <span className="text-muted-foreground font-mono text-[9px] tracking-wider uppercase">
                  Back
                </span>
                <span className="text-muted-foreground/40 font-mono text-[8px]">
                  1376x768
                </span>
              </div>
            </div>
          ) : null}
        </div>
      </SectionContent>
    </div>
  );
}
