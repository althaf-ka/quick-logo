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

const CHECKER_BG = {
  backgroundImage:
    "linear-gradient(45deg, hsl(var(--muted)) 25%, transparent 25%), linear-gradient(-45deg, hsl(var(--muted)) 25%, transparent 25%), linear-gradient(45deg, transparent 75%, hsl(var(--muted)) 75%), linear-gradient(-45deg, transparent 75%, hsl(var(--muted)) 75%)",
  backgroundSize: "16px 16px",
  backgroundPosition: "0 0, 0 8px, 8px -8px, -8px 0px",
} as const;

export function LogoVariationsSection({
  variations,
  onRefine,
  isRefining,
}: LogoVariationsSectionProps) {
  return (
    <div>
      <SectionHeader
        title="Logo Variations"
        sectionId="logo-variations"
        onRefine={onRefine}
        isRefining={isRefining}
      />
      <SectionContent isRefining={isRefining}>
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          {variations.map((v) => (
            <div
              key={v.id}
              className="group border transition-colors hover:border-primary/30"
            >
              <div
                className={cn(
                  "flex aspect-square items-center justify-center p-6",
                  v.background === "dark" && "bg-zinc-900",
                  v.background === "light" && "bg-white",
                )}
                style={v.background === "transparent" ? CHECKER_BG : undefined}
              >
                <img
                  src={v.url}
                  alt={v.label}
                  className="max-h-full max-w-full object-contain drop-shadow-sm"
                />
              </div>
              <div className="border-t px-3 py-2">
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
