import { SectionHeader, SectionContent } from "./section-header";
import { ZoomableImage } from "@/components/global/zoomable-image";
import { useBrandKitSection } from "./section-context";
import { cn } from "@quicklogo/ui/lib/utils";
import { AssetCard } from "./asset-card";

interface BrandGraphicsSectionProps {
  data: {
    backdropPostUrl: string;
    backdropStoryUrl: string;
  };
}

export function BrandGraphicsSection({ data }: BrandGraphicsSectionProps) {
  const {
    targetSectionId,
    targetItemId,
    refiningSectionId,
    cancelRefine,
    onRefine,
  } = useBrandKitSection();

  const isTargeted = (itemId: string) =>
    targetSectionId === "brand-graphics" && targetItemId === itemId;

  const handleToggleRefine = (itemId: string) => {
    if (isTargeted(itemId)) {
      cancelRefine?.();
    } else {
      onRefine?.("brand-graphics", itemId);
    }
  };

  const graphics = [
    {
      id: "backdrop-post",
      title: "Backdrop Post",
      subtitle: "1:1 Ratio",
      url: data.backdropPostUrl,
      aspectClass: "aspect-square sm:aspect-auto",
      imageClass: "max-w-[360px] aspect-square",
    },
    {
      id: "backdrop-story",
      title: "Backdrop Story",
      subtitle: "9:16 Ratio",
      url: data.backdropStoryUrl,
      aspectClass: "aspect-[9/16] sm:aspect-auto",
      imageClass: "max-w-[280px] aspect-[9/16]",
    },
  ];

  return (
    <div>
      <SectionHeader
        title="Brand Graphics"
        sectionId="brand-graphics"
        refineLabel="Refine All Graphics"
      />
      <SectionContent sectionId="brand-graphics">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {graphics.map((graphic) => (
            <AssetCard
              key={graphic.id}
              title={graphic.title}
              subtitle={graphic.subtitle}
              isTargeted={isTargeted(graphic.id)}
              isPlaceholder={
                graphic.url.includes("placehold.co") ||
                Boolean(refiningSectionId)
              }
              onToggleRefine={() => handleToggleRefine(graphic.id)}
            >
              <div
                className={cn(
                  "bg-muted/10 relative flex w-full items-center justify-center overflow-hidden transition-all sm:flex-1",
                  graphic.aspectClass,
                  isTargeted(graphic.id) && "ring-primary z-10 ring-4",
                )}
              >
                <SectionContent
                  sectionId="brand-graphics"
                  targetItemId={graphic.id}
                  className="pointer-events-none absolute inset-0 z-30"
                />
                <div
                  className={cn(
                    "relative flex w-full items-center justify-center overflow-hidden p-4 sm:p-6 sm:py-8",
                    graphic.imageClass,
                  )}
                >
                  <ZoomableImage
                    src={graphic.url}
                    alt={`Brand Graphic — ${graphic.title}`}
                    className="h-full w-full cursor-pointer object-cover transition-transform duration-300"
                  />
                </div>
              </div>
            </AssetCard>
          ))}
        </div>
      </SectionContent>
    </div>
  );
}
