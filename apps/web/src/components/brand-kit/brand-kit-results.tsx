import { Button } from "@quicklogo/ui/components/button";
import { DownloadSimpleIcon } from "@phosphor-icons/react";
import {
  LogoVariationsSection,
  type LogoVariation,
} from "./sections/logo-variations-section";
import {
  ColorPaletteSection,
  type PaletteColor,
} from "./sections/color-palette-section";
import {
  TypographySection,
  type TypographyPairing,
} from "./sections/typography-section";
import { useGoogleFontLoader } from "@/hooks/use-google-font-loader";
import {
  SocialMediaSection,
  type SocialMediaAsset,
} from "./sections/social-media-section";
import {
  BusinessCardSection,
  type BusinessCardData,
} from "./sections/business-card-section";
import { FaviconSection, type FaviconSize } from "./sections/favicon-section";
import { BrandGuidelinesSection } from "./sections/brand-guidelines-section";

export interface BrandKitResultsData {
  logoVariations?: LogoVariation[];
  colorPalette: PaletteColor[];
  typography: TypographyPairing;
  socialMedia?: SocialMediaAsset[];
  businessCard?: BusinessCardData;
  favicons?: FaviconSize[];
  brandName?: string;
  logoUrl?: string;
  productImages?: string[];
}

interface BrandKitResultsProps {
  data: BrandKitResultsData;
  onRefine: (sectionId: string) => void;
  onFontChange?: (role: "heading" | "body", family: string) => void;
  onDownloadAll?: () => void;
  refiningSectionId?: string | null;
}

export function BrandKitResults({
  data,
  onRefine,
  onFontChange,
  onDownloadAll,
  refiningSectionId,
}: BrandKitResultsProps) {
  useGoogleFontLoader(data.typography?.heading?.family);
  useGoogleFontLoader(data.typography?.body?.family);

  return (
    <div className="mx-auto w-full max-w-3xl space-y-8 pb-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-mono text-sm font-black tracking-wider uppercase">
            {data.brandName || "Brand Kit"}
          </h2>
          <p className="text-muted-foreground/50 mt-0.5 font-mono text-[10px]">
            Your complete brand identity package
          </p>
        </div>
        <Button
          variant="default"
          className="cursor-pointer gap-2 rounded-none font-mono text-[11px] tracking-wider uppercase"
          onClick={onDownloadAll}
        >
          <DownloadSimpleIcon weight="bold" className="size-4" />
          Download Kit
        </Button>
      </div>

      <div className="bg-border h-px" />

      {data.logoVariations && data.logoVariations.length > 0 && (
        <LogoVariationsSection
          variations={data.logoVariations}
          onRefine={onRefine}
          isRefining={refiningSectionId === "logo-variations"}
        />
      )}

      <ColorPaletteSection
        colors={data.colorPalette}
        onRefine={onRefine}
        isRefining={refiningSectionId === "color-palette"}
      />

      <TypographySection
        pairing={data.typography}
        brandName={data.brandName}
        onFontChange={onFontChange}
        isRefining={refiningSectionId === "typography"}
      />

      {data.socialMedia && data.socialMedia.length > 0 && (
        <SocialMediaSection
          assets={data.socialMedia}
          onRefine={onRefine}
          isRefining={refiningSectionId === "social-media"}
        />
      )}

      {data.businessCard && (
        <BusinessCardSection
          card={data.businessCard}
          onRefine={onRefine}
          isRefining={refiningSectionId === "business-card"}
        />
      )}

      {data.favicons && data.favicons.length > 0 && (
        <FaviconSection
          icons={data.favicons}
          onRefine={onRefine}
          isRefining={refiningSectionId === "favicon"}
        />
      )}

      {data.logoUrl && (
        <BrandGuidelinesSection
          data={{
            logoUrl: data.logoUrl,
            brandName: data.brandName || "Brand",
            colors: data.colorPalette,
            typography: data.typography,
            productImages: data.productImages,
          }}
          onRefine={onRefine}
          isRefining={refiningSectionId === "brand-guidelines"}
        />
      )}
    </div>
  );
}
