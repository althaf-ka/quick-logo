import { SectionHeader, SectionContent } from "./section-header";
import { cn } from "@quicklogo/ui/lib/utils";

export interface LogoVariation {
  id: string;
  label: string;
  url: string;
  background: "light" | "dark" | "transparent";
}

interface LogoVariationsSectionProps {
  variations: LogoVariation[];
  onRefine?: (sectionId: string) => void;
  isRefining?: boolean;
}

function LogoVariationImage({ v }: { v: LogoVariation }) {
  const isDark = v.id === "dark" || v.background === "dark";

  return (
    <div
      className={cn(
        "relative flex aspect-square items-center justify-center overflow-hidden",
        isDark ? "bg-zinc-950" : "bg-white",
        v.background === "transparent" && "bg-transparent",
      )}
      style={
        v.background === "transparent"
          ? {
              backgroundImage:
                "linear-gradient(45deg, #f0f0f0 25%, transparent 25%), linear-gradient(-45deg, #f0f0f0 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #f0f0f0 75%), linear-gradient(-45deg, transparent 75%, #f0f0f0 75%)",
              backgroundSize: "16px 16px",
              backgroundPosition: "0 0, 0 8px, 8px -8px, -8px 0px",
            }
          : undefined
      }
    >
      <img
        src={v.url}
        alt={v.label}
        className={cn(
          "max-h-full max-w-full object-contain transition-all duration-300",
          v.id === "mono" && "contrast-125 grayscale",
        )}
      />
    </div>
  );
}

export function LogoVariationsSection({
  variations,
  onRefine,
  isRefining,
}: LogoVariationsSectionProps) {
  return (
    <div className="relative">
      <SectionHeader
        title="Logo Variations & Iconography"
        sectionId="logo-variations"
        onRefine={onRefine}
        isRefining={isRefining}
      />

      <SectionContent isRefining={isRefining}>
        <div className="relative grid grid-cols-2 gap-3 md:grid-cols-4">
          {variations.map((v) => (
            <div key={v.id} className="group flex flex-col">
              <LogoVariationImage v={v} />
              <div className="mt-auto px-3 py-2">
                <span className="text-muted-foreground font-mono text-[9px] tracking-wider uppercase">
                  {v.label}
                </span>
              </div>
            </div>
          ))}
        </div>
      </SectionContent>
    </div>
  );
}
