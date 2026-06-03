import { SectionHeader, SectionContent } from "./section-header";
import { ZoomableImage } from "@/components/global/zoomable-image";
import { useBrandKitSection } from "./section-context";
import { cn } from "@quicklogo/ui/lib/utils";
import { AssetCard } from "./asset-card";

interface BrandedBackdropsSectionProps {
  data: {
    feedUrl: string;
    storyUrl: string;
  };
}

export function BrandedBackdropsSection({
  data,
}: BrandedBackdropsSectionProps) {
  const { targetSectionId, targetItemId, cancelRefine, onRefine, refiningSectionId } = useBrandKitSection();
  const isRefining = refiningSectionId === "branded-backdrops";
  const isFeedTargeted = targetSectionId === "branded-backdrops" && targetItemId === "feed";
  const isStoryTargeted = targetSectionId === "branded-backdrops" && targetItemId === "story";

  return (
    <div>
      <SectionHeader
        title="Branded Backdrops"
        sectionId="branded-backdrops"
        onRefine={onRefine}
        refineLabel="Refine All Backdrops"
        isRefining={isRefining}
      />
      <SectionContent isRefining={isRefining && !targetItemId}>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <AssetCard
            title="Instagram Feed"
            subtitle="1:1 Ratio"
            isTargeted={isFeedTargeted}
            isPlaceholder={data.feedUrl.includes("placehold.co")}
            onToggleRefine={() => isFeedTargeted ? cancelRefine?.() : onRefine?.("branded-backdrops", "feed")}
          >
            <div className={cn("bg-muted/10 relative flex aspect-[16/9] w-full items-center justify-center overflow-hidden transition-all sm:aspect-auto sm:flex-1", isFeedTargeted && "ring-4 ring-primary z-10")}>
              <SectionContent
                isRefining={isRefining && targetItemId === "feed"}
                className="pointer-events-none absolute inset-0 z-30"
              />
              <div className="relative flex w-full max-w-[360px] items-center justify-center overflow-hidden p-4 sm:p-6 sm:py-8">
                <ZoomableImage
                  src={data.feedUrl}
                  alt="Branded Backdrop — Feed"
                  className="aspect-[4/5] h-full w-full cursor-pointer object-cover transition-transform duration-300"
                />
              </div>
            </div>
          </AssetCard>

          <AssetCard
            title="Instagram Story"
            subtitle="9:16 Ratio"
            isTargeted={isStoryTargeted}
            isPlaceholder={data.storyUrl.includes("placehold.co")}
            onToggleRefine={() => isStoryTargeted ? cancelRefine?.() : onRefine?.("branded-backdrops", "story")}
          >
            <div className={cn("bg-muted/10 relative flex aspect-[16/9] w-full items-center justify-center overflow-hidden transition-all sm:aspect-auto sm:flex-1", isStoryTargeted && "ring-4 ring-primary z-10")}>
              <SectionContent
                isRefining={isRefining && targetItemId === "story"}
                className="pointer-events-none absolute inset-0 z-30"
              />
              <div className="relative flex w-full max-w-[280px] items-center justify-center overflow-hidden p-4 sm:p-6 sm:py-8">
                <ZoomableImage
                  src={data.storyUrl}
                  alt="Branded Backdrop — Story"
                  className="aspect-[9/16] h-full w-full cursor-pointer object-cover transition-transform duration-300"
                />
              </div>
            </div>
          </AssetCard>
        </div>
      </SectionContent>
    </div>
  );
}
