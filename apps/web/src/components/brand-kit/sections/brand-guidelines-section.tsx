import { CheckCircleIcon, XCircleIcon } from "@phosphor-icons/react";
import { Badge } from "@quicklogo/ui/components/badge";
import type { BrandKitResultsData } from "../results/brand-kit-results";
import { buildBrandGuidelinesViewModel } from "@/lib/brand-kit/build-brand-guidelines-view-model";
import { SectionHeader, SectionContent } from "./section-header";

interface BrandGuidelinesSectionProps {
  data: BrandKitResultsData;
}

export function BrandGuidelinesSection({ data }: BrandGuidelinesSectionProps) {
  const guidelines = buildBrandGuidelinesViewModel(data);
  if (!guidelines) return null;

  return (
    <div>
      <SectionHeader title="Brand Guidelines" sectionId="brand-guidelines" />
      <SectionContent sectionId="brand-guidelines">
        <div className="bg-card flex flex-col gap-4 border p-4 sm:p-6">
          <div className="flex flex-col justify-between gap-4 border-b pb-5 sm:flex-row sm:items-end">
            <div className="flex items-center gap-4">
              {guidelines.primaryLogoUrl ? (
                <div className="flex size-20 shrink-0 items-center justify-center border bg-white p-3">
                  <img
                    src={guidelines.primaryLogoUrl}
                    alt={`${guidelines.brandName} logo`}
                    className="max-h-full max-w-full object-contain"
                  />
                </div>
              ) : null}
              <div className="flex flex-col gap-1">
                <Badge variant="secondary" className="w-fit uppercase">
                  {guidelines.depth} edition
                </Badge>
                <h4
                  className="text-xl font-bold sm:text-2xl"
                  style={{ fontFamily: guidelines.typography.heading.family }}
                >
                  {guidelines.brandName}
                </h4>
                {guidelines.foundation.tagline ? (
                  <p className="text-muted-foreground text-sm italic">
                    “{guidelines.foundation.tagline}”
                  </p>
                ) : null}
              </div>
            </div>
            <p className="text-muted-foreground max-w-md text-xs leading-relaxed">
              A practical identity reference covering approved logo use, color,
              typography, accessibility, and brand expression.
            </p>
          </div>

          {guidelines.foundation.missionStatement ? (
            <div className="grid gap-2 border p-4 sm:grid-cols-[8rem_1fr]">
              <p className="text-muted-foreground font-mono text-[9px] font-bold tracking-widest uppercase">
                Brand purpose
              </p>
              <p className="text-sm leading-relaxed">
                {guidelines.foundation.missionStatement}
              </p>
            </div>
          ) : null}

          <div className="grid gap-3 lg:grid-cols-3">
            <div className="flex flex-col gap-3 border p-4">
              <p className="font-mono text-[9px] font-bold tracking-widest uppercase">
                Clear space
              </p>
              <div className="bg-muted/30 flex min-h-32 items-center justify-center p-6">
                <div className="border-primary/60 relative border border-dashed p-5">
                  {guidelines.primaryLogoUrl ? (
                    <img
                      src={guidelines.primaryLogoUrl}
                      alt="Logo clear-space example"
                      className="max-h-12 max-w-36 object-contain"
                    />
                  ) : null}
                  <span className="text-primary absolute -top-4 left-0 font-mono text-[8px]">
                    X
                  </span>
                </div>
              </div>
              <p className="text-muted-foreground text-xs leading-relaxed">
                Keep at least {guidelines.logoRules.clearSpaceRatio * 100}% of
                the displayed logo height clear on every side.
              </p>
            </div>

            <div className="flex flex-col gap-3 border p-4">
              <p className="font-mono text-[9px] font-bold tracking-widest uppercase">
                Minimum size
              </p>
              <div className="flex min-h-32 items-end justify-center gap-5 bg-white p-5 text-black">
                <div className="flex flex-col items-center gap-2">
                  {guidelines.primaryLogoUrl ? (
                    <img
                      src={guidelines.primaryLogoUrl}
                      alt="Minimum logo size"
                      className="max-h-10 w-28 object-contain"
                    />
                  ) : null}
                  <span className="font-mono text-[8px]">
                    {guidelines.logoRules.minimumDigitalWidth}px
                  </span>
                </div>
                <div className="flex flex-col items-center gap-2">
                  <div className="size-8 border border-black/20" />
                  <span className="font-mono text-[8px]">
                    {guidelines.logoRules.minimumMarkSize}px
                  </span>
                </div>
              </div>
              <p className="text-muted-foreground text-xs leading-relaxed">
                Recommended digital minimums preserve clarity. Verify small
                reproduction before production use.
              </p>
            </div>

            <div className="flex flex-col gap-3 border p-4">
              <p className="font-mono text-[9px] font-bold tracking-widest uppercase">
                Incorrect usage
              </p>
              <div className="flex flex-col gap-2">
                {guidelines.logoRules.misuseRules.map((rule) => (
                  <div key={rule} className="flex items-start gap-2">
                    <XCircleIcon className="mt-0.5 shrink-0 text-red-400" />
                    <p className="text-muted-foreground text-xs leading-relaxed">
                      {rule}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="flex flex-col gap-3 border p-4">
            <div className="flex items-center justify-between gap-3">
              <p className="font-mono text-[9px] font-bold tracking-widest uppercase">
                Color specifications
              </p>
              <p className="text-muted-foreground font-mono text-[8px] uppercase">
                WCAG text contrast checked
              </p>
            </div>
            <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {guidelines.colors.map((color) => (
                <div key={`${color.role}-${color.hex}`} className="border">
                  <div
                    className="flex min-h-20 items-end justify-between gap-2 p-3"
                    style={{
                      backgroundColor: color.hex,
                      color: color.preferredTextColor,
                    }}
                  >
                    <span className="text-xs font-bold">{color.role}</span>
                    <span className="font-mono text-[9px]">{color.hex}</span>
                  </div>
                  <div className="flex flex-col gap-1 p-3 font-mono text-[8px]">
                    <span>RGB {color.rgb}</span>
                    <span>CMYK approx. {color.approximateCmyk}</span>
                    <span className="flex items-center gap-1">
                      <CheckCircleIcon className="text-emerald-400" />
                      {color.contrastRatio.toFixed(2)}:1 with{" "}
                      {color.preferredTextColor}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="grid gap-3 md:grid-cols-2">
            {[
              {
                label: "Heading",
                font: guidelines.typography.heading,
                sample:
                  guidelines.typography.heading.sampleText ||
                  guidelines.brandName,
              },
              {
                label: "Body",
                font: guidelines.typography.body,
                sample:
                  guidelines.typography.body.sampleText ||
                  "A brand identity that speaks to your audience with clarity and confidence. Every detail matters.",
              },
            ].map(({ label, font, sample }) => (
              <div key={label} className="flex flex-col gap-3 border p-4">
                <p className="text-muted-foreground font-mono text-[9px] tracking-widest uppercase">
                  {label} typeface
                </p>
                <p
                  className={
                    label === "Heading"
                      ? "text-2xl leading-tight"
                      : "text-sm leading-relaxed"
                  }
                  style={{ fontFamily: font.family, fontWeight: font.weight }}
                >
                  {sample}
                </p>
                <p className="text-muted-foreground font-mono text-[9px]">
                  {font.family} · {font.weight}
                </p>
              </div>
            ))}
          </div>

          {guidelines.isComplete && guidelines.voice ? (
            <div className="grid gap-3 lg:grid-cols-3">
              <div className="flex flex-col gap-3 border p-4">
                <p className="font-mono text-[9px] font-bold tracking-widest uppercase">
                  Voice traits
                </p>
                <p className="text-muted-foreground text-[10px] leading-relaxed">
                  Writing personality, separate from typography and font weight.
                </p>
                <div className="flex flex-wrap gap-2">
                  {guidelines.voice.traits.map((trait) => (
                    <Badge key={trait} variant="outline">
                      {trait}
                    </Badge>
                  ))}
                </div>
              </div>
              <GuidanceList title="Do" items={guidelines.voice.dos} positive />
              <GuidanceList title="Avoid" items={guidelines.voice.donts} />
            </div>
          ) : null}

          {guidelines.isComplete && guidelines.applications.length > 0 ? (
            <div className="flex flex-col gap-3 border p-4">
              <p className="font-mono text-[9px] font-bold tracking-widest uppercase">
                Brand in application
              </p>
              <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
                {guidelines.applications.map((application) => (
                  <figure key={application.label} className="border">
                    <img
                      src={application.url}
                      alt={application.label}
                      className="aspect-[4/3] w-full object-cover"
                    />
                    <figcaption className="p-2 font-mono text-[8px] tracking-wider uppercase">
                      {application.label}
                    </figcaption>
                  </figure>
                ))}
              </div>
            </div>
          ) : null}

          <div className="flex items-center justify-between border-t pt-3">
            <p className="text-muted-foreground font-mono text-[9px] tracking-wider uppercase">
              PDF documentation
            </p>
            <span className="text-muted-foreground font-mono text-[8px] uppercase">
              Included in the Brand Kit ZIP
            </span>
          </div>
        </div>
      </SectionContent>
    </div>
  );
}

function GuidanceList({
  title,
  items,
  positive = false,
}: {
  title: string;
  items: string[];
  positive?: boolean;
}) {
  return (
    <div className="flex flex-col gap-3 border p-4">
      <p className="font-mono text-[9px] font-bold tracking-widest uppercase">
        {title}
      </p>
      <div className="flex flex-col gap-2">
        {items.map((item) => {
          const Icon = positive ? CheckCircleIcon : XCircleIcon;
          return (
            <div key={item} className="flex items-start gap-2">
              <Icon
                className={positive ? "text-emerald-400" : "text-red-400"}
              />
              <p className="text-muted-foreground text-xs leading-relaxed">
                {item}
              </p>
            </div>
          );
        })}
      </div>
    </div>
  );
}
