import { SectionHeader, SectionContent } from "./section-header";
import { downloadImage } from "@/lib/download";
import { Button } from "@quicklogo/ui/components/button";
import { DownloadSimpleIcon } from "@phosphor-icons/react";

export interface BusinessCardData {
  frontUrl: string;
  backUrl?: string;
}

interface BusinessCardSectionProps {
  card: BusinessCardData;
  onRefine?: (sectionId: string) => void;
  isRefining?: boolean;
}

export function BusinessCardSection({
  card,
  onRefine,
  isRefining,
}: BusinessCardSectionProps) {
  return (
    <div>
      <SectionHeader
        title="Business Card"
        sectionId="business-card"
        onRefine={onRefine}
        isRefining={isRefining}
      />
      <SectionContent isRefining={isRefining}>
        <div className="grid gap-4 md:grid-cols-2">
          <div className="group border-border/50 hover:border-primary/40 bg-card flex flex-col overflow-hidden border transition-colors">
            <div className="bg-muted/10 relative flex aspect-[16/9] w-full flex-1 items-center justify-center overflow-hidden">
              <img
                src={card.frontUrl}
                alt="Business Card — Front"
                className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.01]"
              />
            </div>
            <div className="bg-muted/5 flex w-full shrink-0 items-center justify-between border-t px-4 py-2.5">
              <span className="text-muted-foreground font-mono text-[9px] tracking-wider uppercase">
                Front
              </span>
              <div className="flex items-center gap-2">
                <span className="text-muted-foreground/40 font-mono text-[8px]">
                  1376x768
                </span>
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-muted-foreground/40 hover:text-primary hover:bg-primary/10 h-6 w-6 cursor-pointer p-0 transition-all"
                  onClick={() =>
                    downloadImage(card.frontUrl, "business-card-front.png")
                  }
                  title="Download Front"
                >
                  <DownloadSimpleIcon className="size-3.5" />
                  <span className="sr-only">Download</span>
                </Button>
              </div>
            </div>
          </div>

          {card.backUrl && (
            <div className="group border-border/50 hover:border-primary/40 bg-card flex flex-col overflow-hidden border transition-colors">
              <div className="bg-muted/10 relative flex aspect-[16/9] w-full flex-1 items-center justify-center overflow-hidden">
                <img
                  src={card.backUrl}
                  alt="Business Card — Back"
                  className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.01]"
                />
              </div>
              <div className="bg-muted/5 flex w-full shrink-0 items-center justify-between border-t px-4 py-2.5">
                <span className="text-muted-foreground font-mono text-[9px] tracking-wider uppercase">
                  Back
                </span>
                <div className="flex items-center gap-2">
                  <span className="text-muted-foreground/40 font-mono text-[8px]">
                    1376x768
                  </span>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-muted-foreground/40 hover:text-primary hover:bg-primary/10 h-6 w-6 cursor-pointer p-0 transition-all"
                    onClick={() =>
                      downloadImage(card.backUrl!, "business-card-back.png")
                    }
                    title="Download Back"
                  >
                    <DownloadSimpleIcon className="size-3.5" />
                    <span className="sr-only">Download</span>
                  </Button>
                </div>
              </div>
            </div>
          )}
        </div>
      </SectionContent>
    </div>
  );
}
