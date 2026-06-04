import { SectionHeader, SectionContent } from "./section-header";
import { ZoomableImage } from "@/components/global/zoomable-image";
import { useBrandKitSection } from "./section-context";
import { cn } from "@quicklogo/ui/lib/utils";
import { AssetCard } from "./asset-card";

export interface BusinessCardData {
  frontUrl: string;
  backUrl?: string;
}

interface BusinessCardSectionProps {
  card: BusinessCardData;
}

export function BusinessCardSection({ card }: BusinessCardSectionProps) {
  const { targetSectionId, targetItemId, cancelRefine, onRefine } =
    useBrandKitSection();
  const isFrontTargeted =
    targetSectionId === "business-card" && targetItemId === "front";
  const isBackTargeted =
    targetSectionId === "business-card" && targetItemId === "back";

  return (
    <div>
      <SectionHeader
        title="Business Card"
        sectionId="business-card"
        refineLabel="Refine All Cards"
      />
      <SectionContent sectionId="business-card">
        <div className="grid gap-4 md:grid-cols-2">
          <AssetCard
            title="Front"
            isTargeted={isFrontTargeted}
            isPlaceholder={card.frontUrl.includes("placehold.co")}
            onToggleRefine={() =>
              isFrontTargeted
                ? cancelRefine?.()
                : onRefine?.("business-card", "front")
            }
          >
            <div
              className={cn(
                "bg-muted/10 relative flex aspect-[16/9] w-full items-center justify-center overflow-hidden transition-all",
                isFrontTargeted && "ring-primary z-10 ring-4",
              )}
            >
              <SectionContent
                sectionId="business-card"
                targetItemId="front"
                className="pointer-events-none absolute inset-0 z-30"
              />
              <ZoomableImage
                src={card.frontUrl}
                alt="Business Card — Front"
                className="h-full w-full cursor-pointer object-cover transition-transform duration-300"
              />
            </div>
          </AssetCard>

          {card.backUrl ? (
            <AssetCard
              title="Back"
              isTargeted={isBackTargeted}
              isPlaceholder={card.backUrl?.includes("placehold.co")}
              onToggleRefine={() =>
                isBackTargeted
                  ? cancelRefine?.()
                  : onRefine?.("business-card", "back")
              }
            >
              <div
                className={cn(
                  "bg-muted/10 relative flex aspect-[16/9] w-full items-center justify-center overflow-hidden transition-all",
                  isBackTargeted && "ring-primary z-10 ring-4",
                )}
              >
                <SectionContent
                  sectionId="business-card"
                  targetItemId="back"
                  className="pointer-events-none absolute inset-0 z-30"
                />
                <ZoomableImage
                  src={card.backUrl}
                  alt="Business Card — Back"
                  className="h-full w-full cursor-pointer object-cover transition-transform duration-300"
                />
              </div>
            </AssetCard>
          ) : null}
        </div>
      </SectionContent>
    </div>
  );
}
