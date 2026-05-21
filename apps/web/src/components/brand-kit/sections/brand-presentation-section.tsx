import { SectionHeader, SectionContent } from "./section-header";
import type { BrandKitResultsData } from "../brand-kit-results";

interface BrandPresentationSectionProps {
  data: BrandKitResultsData;
  typographyStyle?: string;
  onRefine?: (sectionId: string) => void;
  isRefining?: boolean;
}

export function BrandPresentationSection({
  data,
  typographyStyle,
  onRefine,
  isRefining,
}: BrandPresentationSectionProps) {
  const presentationUrl = data.brandPresentation?.presentationUrl;
  const isPlaceholder =
    !presentationUrl || presentationUrl.includes("placehold.co");

  // Check style direction
  const curvyStyles = ["friendly-round", "playful-display", "elegant-script"];
  const isCurvy = curvyStyles.includes(typographyStyle || "");

  // Borderless frame matching style direction
  const imageFrameClass = isCurvy
    ? "rounded-[24px] overflow-hidden"
    : "rounded-none overflow-hidden";

  return (
    <div>
      <SectionHeader
        title="Brand Presentation"
        sectionId="brand-presentation"
        onRefine={onRefine}
        isRefining={isRefining}
      />
      <SectionContent isRefining={isRefining}>
        {/* 16:9 Widescreen Image Wrapper - Blends seamlessly into UI */}
        <div
          className={`bg-muted/10 relative flex aspect-[16/9] w-full items-center justify-center ${imageFrameClass}`}
        >
          <img
            src={
              presentationUrl ||
              "https://placehold.co/1376x768/0d0e12/1e293b?text=Generating+Brand+Presentation..."
            }
            alt="AI Brand Presentation Mockup"
            className={`h-full w-full object-cover ${
              isPlaceholder ? "opacity-35 blur-sm" : ""
            }`}
          />
          {isPlaceholder && (
            <div className="bg-background/40 absolute inset-0 z-20 flex flex-col items-center justify-center gap-2 p-4 text-center backdrop-blur-md">
              <span className="animate-pulse font-mono text-xs font-bold tracking-widest text-amber-500 uppercase">
                AI Generation Queued
              </span>
              <p className="text-muted-foreground max-w-[340px] font-mono text-xs leading-relaxed">
                AI is designing a premium presentation layout representing your
                brand colors, patterns, and style identity...
              </p>
            </div>
          )}
        </div>
      </SectionContent>
    </div>
  );
}
