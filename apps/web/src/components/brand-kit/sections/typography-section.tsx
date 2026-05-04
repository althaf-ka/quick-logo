import { SectionHeader, SectionContent } from "./section-header";

export interface TypographyPairing {
  heading: {
    name: string;
    family: string;
    weight: string;
    sampleText?: string;
  };
  body: {
    name: string;
    family: string;
    weight: string;
    sampleText?: string;
  };
}

interface TypographySectionProps {
  pairing: TypographyPairing;
  brandName?: string;
  onRefine?: (sectionId: string) => void;
  isRefining?: boolean;
}

export function TypographySection({
  pairing,
  brandName,
  onRefine,
  isRefining,
}: TypographySectionProps) {
  const headingSample =
    pairing.heading.sampleText || brandName || "Your Brand Name";
  const bodySample =
    pairing.body.sampleText ||
    "A brand identity that speaks to your audience with clarity and confidence. Every detail matters.";

  return (
    <div>
      <SectionHeader
        title="Typography System"
        sectionId="typography"
        onRefine={onRefine}
        isRefining={isRefining}
      />
      <SectionContent isRefining={isRefining}>
        <div className="grid gap-3 md:grid-cols-2">
          <div className="border p-5">
            <p className="text-muted-foreground/50 mb-3 font-mono text-[9px] tracking-widest uppercase">
              Heading — {pairing.heading.name}
            </p>
            <p
              className="text-3xl leading-tight font-bold"
              style={{
                fontFamily: pairing.heading.family,
                fontWeight: pairing.heading.weight,
              }}
            >
              {headingSample}
            </p>
            <div className="bg-border/40 mt-4 h-px" />
            <div className="mt-3 grid grid-cols-4 gap-2">
              {["Aa", "Bb", "Cc", "Dd"].map((pair) => (
                <div
                  key={pair}
                  className="text-muted-foreground/70 text-center text-xl"
                  style={{ fontFamily: pairing.heading.family }}
                >
                  {pair}
                </div>
              ))}
            </div>
            <p className="text-muted-foreground/40 mt-3 font-mono text-[9px]">
              {pairing.heading.family} · {pairing.heading.weight}
            </p>
          </div>

          <div className="border p-5">
            <p className="text-muted-foreground/50 mb-3 font-mono text-[9px] tracking-widest uppercase">
              Body — {pairing.body.name}
            </p>
            <p
              className="text-sm leading-relaxed"
              style={{
                fontFamily: pairing.body.family,
                fontWeight: pairing.body.weight,
              }}
            >
              {bodySample}
            </p>
            <div className="bg-border/40 mt-4 h-px" />
            <div className="mt-3 space-y-1">
              {[
                { label: "Regular", weight: "400" },
                { label: "Medium", weight: "500" },
                { label: "Bold", weight: "700" },
              ].map((w) => (
                <p
                  key={w.label}
                  className="text-muted-foreground/70 text-xs"
                  style={{
                    fontFamily: pairing.body.family,
                    fontWeight: w.weight,
                  }}
                >
                  {w.label} — The quick brown fox jumps over the lazy dog
                </p>
              ))}
            </div>
            <p className="text-muted-foreground/40 mt-3 font-mono text-[9px]">
              {pairing.body.family} · {pairing.body.weight}
            </p>
          </div>
        </div>
      </SectionContent>
    </div>
  );
}
