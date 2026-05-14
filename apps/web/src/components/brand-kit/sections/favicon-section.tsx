import { SectionHeader, SectionContent } from "./section-header";

export interface FaviconSize {
  size: number;
  label: string;
  url: string;
}

interface FaviconSectionProps {
  icons: FaviconSize[];
  onRefine?: (sectionId: string) => void;
  isRefining?: boolean;
}

const CHECKER_BG = {
  backgroundImage:
    "linear-gradient(45deg, hsl(var(--muted)) 25%, transparent 25%), linear-gradient(-45deg, hsl(var(--muted)) 25%, transparent 25%), linear-gradient(45deg, transparent 75%, hsl(var(--muted)) 75%), linear-gradient(-45deg, transparent 75%, hsl(var(--muted)) 75%)",
  backgroundSize: "8px 8px",
  backgroundPosition: "0 0, 0 4px, 4px -4px, -4px 0px",
} as const;

const DISPLAY_SIZE = 80;

export function FaviconSection({
  icons,
  onRefine,
  isRefining,
}: FaviconSectionProps) {
  return (
    <div>
      <SectionHeader
        title="Favicon & App Icons"
        sectionId="favicon"
        onRefine={onRefine}
        isRefining={isRefining}
      />
      <SectionContent isRefining={isRefining}>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {icons.map((icon, i) => (
            <div
              key={i}
              className="group hover:border-primary/30 flex flex-col items-center gap-3 border p-4 transition-colors"
            >
              <div
                className="flex items-center justify-center"
                style={{
                  ...CHECKER_BG,
                  width: DISPLAY_SIZE,
                  height: DISPLAY_SIZE,
                }}
              >
                <img
                  src={icon.url}
                  alt={icon.label}
                  className="object-contain"
                  style={{
                    width: DISPLAY_SIZE - 12,
                    height: DISPLAY_SIZE - 12,
                  }}
                />
              </div>
              <div className="text-center">
                <p className="font-mono text-[10px] font-bold uppercase">
                  {icon.size}×{icon.size}
                </p>
                <p className="text-muted-foreground/50 font-mono text-[8px] tracking-wider uppercase">
                  {icon.label}
                </p>
              </div>
            </div>
          ))}
        </div>
      </SectionContent>
    </div>
  );
}
