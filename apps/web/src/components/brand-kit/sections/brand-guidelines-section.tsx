import { SectionHeader, SectionContent } from "./section-header";
import type { PaletteColor } from "./color-palette-section";
import type { TypographyPairing } from "./typography-section";

export interface BrandGuidelinesData {
  logoUrl: string;
  brandName: string;
  colors: PaletteColor[];
  typography: TypographyPairing;
  productImages?: string[];
}

interface BrandGuidelinesSectionProps {
  data: BrandGuidelinesData;
}

export function BrandGuidelinesSection({ data }: BrandGuidelinesSectionProps) {
  const hasProducts = data.productImages && data.productImages.length > 0;

  return (
    <div>
      <SectionHeader title="Brand Guidelines" sectionId="brand-guidelines" />
      <SectionContent sectionId="brand-guidelines">
        <div className="border">
          <div className="bg-card p-4 sm:p-6">
            <div className="grid grid-cols-6 gap-2 sm:gap-3">
              <div className="col-span-3 flex items-center justify-center border bg-white p-6">
                <img
                  src={data.logoUrl}
                  alt={data.brandName}
                  className="max-h-24 max-w-full object-contain"
                />
              </div>

              <div className="col-span-3 flex flex-col justify-center border p-4">
                <p className="text-muted-foreground/40 font-mono text-[8px] tracking-widest uppercase">
                  Brand Identity
                </p>
                <p
                  className="mt-1 text-base leading-tight font-bold sm:text-lg"
                  style={{ fontFamily: data.typography.heading.family }}
                >
                  {data.brandName}
                </p>
                <p
                  className="text-muted-foreground mt-1 text-[10px] leading-relaxed"
                  style={{ fontFamily: data.typography.body.family }}
                >
                  Brand guidelines with usage rules, spacing, and application
                  examples.
                </p>
              </div>

              <div className="col-span-6 flex items-stretch overflow-hidden border">
                {data.colors.slice(0, 6).map((color, i) => (
                  <div key={i} className="flex flex-1 flex-col">
                    <div
                      className="flex-1"
                      style={{ backgroundColor: color.hex, minHeight: 28 }}
                    />
                    <div className="bg-card px-1 py-0.5">
                      <p className="truncate font-mono text-[7px] uppercase">
                        {color.hex}
                      </p>
                    </div>
                  </div>
                ))}
              </div>

              <div className="col-span-3 flex items-center gap-3 border p-3 sm:gap-4 sm:p-4">
                <div className="flex-1">
                  <p className="text-muted-foreground/40 font-mono text-[7px] tracking-widest uppercase">
                    Heading
                  </p>
                  <p
                    className="text-xs font-bold sm:text-sm"
                    style={{ fontFamily: data.typography.heading.family }}
                  >
                    {data.typography.heading.name}
                  </p>
                </div>
                <div className="bg-border h-6 w-px sm:h-8" />
                <div className="flex-1">
                  <p className="text-muted-foreground/40 font-mono text-[7px] tracking-widest uppercase">
                    Body
                  </p>
                  <p
                    className="text-xs sm:text-sm"
                    style={{ fontFamily: data.typography.body.family }}
                  >
                    {data.typography.body.name}
                  </p>
                </div>
              </div>

              <div className="col-span-3 overflow-hidden border">
                {hasProducts ? (
                  <div className="grid grid-cols-3 gap-0">
                    {data.productImages?.slice(0, 3).map((url, i) => (
                      <div key={i} className="bg-muted/20 overflow-hidden">
                        <img
                          src={url}
                          alt={`Application ${i + 1}`}
                          className="aspect-square w-full object-cover"
                        />
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="flex h-full items-center justify-center p-4">
                    <p className="text-muted-foreground/30 font-mono text-[8px] tracking-widest uppercase">
                      Logo Applications
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="border-t px-4 py-2.5">
            <div className="flex items-center justify-between">
              <p className="text-muted-foreground font-mono text-[9px] tracking-wider uppercase">
                Brand Guidelines PDF Preview
              </p>
              <span className="text-muted-foreground/40 font-mono text-[8px]">
                Included in download
              </span>
            </div>
          </div>
        </div>
      </SectionContent>
    </div>
  );
}
