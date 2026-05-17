import { SectionHeader, SectionContent } from "./section-header";

interface BrandedBackdropsSectionProps {
  data: {
    feedUrl: string;
    storyUrl: string;
  };
  onRefine?: (sectionId: string) => void;
  isRefining?: boolean;
}

export function BrandedBackdropsSection({
  data,
  onRefine,
  isRefining,
}: BrandedBackdropsSectionProps) {
  return (
    <div>
      <SectionHeader
        title="Branded Backdrops"
        sectionId="branded-backdrops"
        onRefine={onRefine}
        isRefining={isRefining}
      />
      <SectionContent isRefining={isRefining}>
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="group hover:border-primary/30 border transition-colors">
            <div className="bg-muted/20 flex items-center justify-center overflow-hidden">
              <img
                src={data.feedUrl}
                alt="Instagram/LinkedIn Feed Backdrop"
                className="aspect-square w-full object-cover"
              />
            </div>
            <div className="flex items-center justify-between border-t px-3 py-2">
              <div>
                <p className="font-mono text-[10px] font-bold uppercase">
                  Feed Backdrop
                </p>
                <p className="text-muted-foreground font-mono text-[9px] tracking-wider uppercase">
                  1:1 Ratio
                </p>
              </div>
              <span className="text-muted-foreground/40 font-mono text-[8px]">
                1080x1080
              </span>
            </div>
          </div>
          <div className="group hover:border-primary/30 border transition-colors">
            <div className="bg-muted/20 flex items-center justify-center overflow-hidden">
              <img
                src={data.storyUrl}
                alt="Instagram/TikTok Story Backdrop"
                className="aspect-[9/16] w-full object-cover"
              />
            </div>
            <div className="flex items-center justify-between border-t px-3 py-2">
              <div>
                <p className="font-mono text-[10px] font-bold uppercase">
                  Story Backdrop
                </p>
                <p className="text-muted-foreground font-mono text-[9px] tracking-wider uppercase">
                  9:16 Ratio
                </p>
              </div>
              <span className="text-muted-foreground/40 font-mono text-[8px]">
                1080x1920
              </span>
            </div>
          </div>
        </div>
      </SectionContent>
    </div>
  );
}
