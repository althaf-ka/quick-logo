import { SectionHeader, SectionContent } from "./section-header";
import type { BrandKitResultsData } from "../results/brand-kit-results";

interface BrandPresentationSectionProps {
  data: BrandKitResultsData;
}

export function BrandPresentationSection({
  data,
}: BrandPresentationSectionProps) {
  const presentationUrl = data.brandPresentation?.presentationUrl;
  const isPlaceholder =
    !presentationUrl || presentationUrl.includes("placehold.co");

  return (
    <div>
      <SectionHeader
        title="Brand Presentation"
        sectionId="brand-presentation"
      />
      <SectionContent sectionId="brand-presentation">
        <div className="bg-muted/10 relative flex aspect-[3/2] w-full items-center justify-center overflow-hidden">
          <img
            src={
              presentationUrl ||
              "https://placehold.co/1536x1024/0d0e12/1e293b?text=Generating+Brand+Presentation..."
            }
            alt={`${data.brandName || "Brand"} identity application presentation`}
            className={`h-full w-full object-cover ${
              isPlaceholder ? "opacity-35 blur-sm" : ""
            }`}
          />
          {isPlaceholder ? (
            <div className="bg-background/40 absolute inset-0 z-20 flex flex-col items-center justify-center gap-2 p-4 text-center backdrop-blur-md">
              <span className="animate-pulse font-mono text-xs font-bold tracking-widest text-amber-500 uppercase">
                AI Generation Queued
              </span>
              <p className="text-muted-foreground max-w-[340px] font-mono text-xs leading-relaxed">
                AI is composing your identity across campaign, digital, and
                real-world touchpoints...
              </p>
            </div>
          ) : null}
        </div>
      </SectionContent>
    </div>
  );
}
