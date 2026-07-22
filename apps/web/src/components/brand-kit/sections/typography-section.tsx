import { useState } from "react";
import { Button } from "@quicklogo/ui/components/button";
import { PencilSimpleIcon, CheckIcon } from "@phosphor-icons/react";
import { FontPicker } from "../font-picker";
import { useGoogleFontLoader } from "@/hooks/use-google-font-loader";
import { SectionContent } from "./section-header";
import { cn } from "@quicklogo/ui/lib/utils";

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
  onFontChange?: (role: "heading" | "body", family: string) => void;
  isSaving?: boolean;
}

export function TypographySection({
  pairing,
  brandName,
  onFontChange,
  isSaving = false,
}: TypographySectionProps) {
  const [isEditing, setIsEditing] = useState(false);
  const headingSample =
    pairing.heading.sampleText || brandName || "Your Brand Name";
  const bodySample =
    pairing.body.sampleText ||
    "A brand identity that speaks to your audience with clarity and confidence. Every detail matters.";

  useGoogleFontLoader(pairing.heading.family);
  useGoogleFontLoader(pairing.body.family);

  return (
    <div>
      <div className="flex items-center justify-between pb-3">
        <h3 className="font-mono text-[11px] font-black tracking-widest uppercase">
          Typography System
        </h3>
        {onFontChange ? (
          <Button
            variant="outline"
            size="sm"
            className={cn(
              "h-auto cursor-pointer gap-1.5 border px-2.5 py-1 font-mono text-[9px] font-bold tracking-wider uppercase transition-all active:scale-95",
              isEditing
                ? "border-primary/50 bg-primary/20 text-primary hover:bg-primary/30"
                : "text-foreground/70 hover:bg-primary/10 hover:text-primary",
            )}
            onClick={() => setIsEditing((current) => !current)}
          >
            {isEditing ? (
              <>
                <CheckIcon weight="bold" className="text-primary size-3" />
                Done
              </>
            ) : (
              <>
                <PencilSimpleIcon
                  weight="bold"
                  className="text-primary size-3"
                />
                Edit Fonts
              </>
            )}
          </Button>
        ) : null}
      </div>
      <SectionContent sectionId="typography">
        {isEditing && onFontChange ? (
          <div className="bg-muted/20 mb-4 space-y-3 border border-dashed p-4">
            <p className="text-muted-foreground/50 font-mono text-[9px] leading-relaxed tracking-wide">
              Select a font for each role. Your brand kit uses two fonts — one
              for headlines and one for body text.
            </p>
            <div className="grid gap-3 md:grid-cols-2">
              <FontPicker
                label="Heading Font"
                value={pairing.heading.family}
                onValueChange={(family) => onFontChange("heading", family)}
                disabled={isSaving}
              />
              <FontPicker
                label="Body Font"
                value={pairing.body.family}
                onValueChange={(family) => onFontChange("body", family)}
                disabled={isSaving}
              />
            </div>
          </div>
        ) : null}

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
