import { useIsMobile } from "@quicklogo/ui/hooks/use-mobile";
import { cn } from "@quicklogo/ui/lib/utils";
import { motion } from "motion/react";
import { activeFocusVariant } from "@/lib/motion/variants";
import {
  LogoVariationsSection,
  type LogoVariation,
} from "../sections/logo-variations-section";
import {
  ColorPaletteSection,
  type PaletteColor,
} from "../sections/color-palette-section";
import {
  TypographySection,
  type TypographyPairing,
} from "../sections/typography-section";
import { useGoogleFontLoader } from "@/hooks/use-google-font-loader";
import {
  SocialMediaSection,
  type SocialMediaAsset,
} from "../sections/social-media-section";
import { BrandKitSectionContext } from "../sections/section-context";
import {
  BusinessCardSection,
  type BusinessCardData,
} from "../sections/business-card-section";
import { FaviconSection, type FaviconSize } from "../sections/favicon-section";
import { BrandGuidelinesSection } from "../sections/brand-guidelines-section";
import { BrandGraphicsSection } from "../sections/brand-graphics-section";
import { BrandPresentationSection } from "../sections/brand-presentation-section";
import { ErrorBoundary } from "@/components/global/error-boundary";
import type { BrandGuidelinesContent } from "@quicklogo/shared";

export interface BrandKitResultsData {
  logoVariations?: LogoVariation[];
  colorPalette: PaletteColor[];
  typography: TypographyPairing;
  socialMedia?: SocialMediaAsset[];
  socialMediaKit?: {
    version: number;
  };
  businessCard?: BusinessCardData;
  favicons?: FaviconSize[];
  brandName?: string;
  logoUrl?: string;
  productImages?: string[];
  brandGraphics?: {
    backdropPostUrl: string;
    backdropStoryUrl: string;
  };
  /** @deprecated Use brandGraphics. Kept for backward compatibility with existing kits. */
  brandedBackdrops?: { feedUrl: string; storyUrl: string };
  brandPresentation?: {
    tagline: string;
    description: string;
    presentationUrl?: string;
  };
  brandGuidelines?: BrandGuidelinesContent;
  deliverables?: Partial<
    Record<
      | "logoVariations"
      | "socialMedia"
      | "businessCard"
      | "favicon"
      | "brandGraphics"
      | "brandPresentation"
      | "brandGuidelines",
      boolean
    >
  >;
}

interface BrandKitResultsProps {
  data: BrandKitResultsData;
  onRefine: (sectionId: string | null, targetItemId?: string) => void;
  onFontChange: (role: "heading" | "body", family: string) => void;
  onPaletteChange: (colors: PaletteColor[]) => void;
  isSavingEdit?: boolean;
  refiningSectionId?: string | null;
  targetSectionId?: string | null;
  targetItemId?: string | null;
  headerAction?: React.ReactNode;
}

interface FocusWrapperProps {
  id: string;
  children: React.ReactNode;
  className?: string;
  refiningSectionId?: string | null;
  isMobile?: boolean;
  anyRefining: boolean;
  targetSectionId?: string | null;
}

const FocusWrapper = ({
  id,
  children,
  className,
  refiningSectionId,
  isMobile,
  anyRefining,
  targetSectionId,
}: FocusWrapperProps) => {
  const isRefining = refiningSectionId === id;
  const variant = isMobile
    ? "inactive"
    : isRefining
      ? "focused"
      : anyRefining
        ? "dimmed"
        : "inactive";

  return (
    <motion.div
      layout
      variants={activeFocusVariant}
      initial="inactive"
      animate={variant}
      className={cn("group/section", className)}
      data-targeted={targetSectionId === id}
      transition={{ type: "spring", stiffness: 300, damping: 30 }}
      style={{ originY: 0.5, originX: 0.5 }}
    >
      <div
        className={
          isRefining
            ? "pointer-events-auto relative z-10"
            : anyRefining
              ? "pointer-events-none"
              : ""
        }
      >
        <ErrorBoundary>{children}</ErrorBoundary>
      </div>
    </motion.div>
  );
};

export function BrandKitResults({
  data,
  onRefine,
  onFontChange,
  onPaletteChange,
  isSavingEdit,
  refiningSectionId,
  targetSectionId,
  targetItemId,
  headerAction,
}: BrandKitResultsProps) {
  useGoogleFontLoader(data.typography?.heading?.family);
  useGoogleFontLoader(data.typography?.body?.family);

  const isMobile = useIsMobile();
  const anyRefining = !!refiningSectionId;

  return (
    <BrandKitSectionContext.Provider
      value={{
        targetSectionId,
        targetItemId,
        refiningSectionId,
        cancelRefine: () => onRefine(null),
        onRefine: (sectionId: string, targetItemId?: string) =>
          onRefine(sectionId, targetItemId),
      }}
    >
      <div className="mx-auto w-full max-w-6xl px-6 pt-12 pb-12 sm:px-8 md:px-12 lg:px-16">
        {/* Header */}
        <div className="mb-6 flex flex-row items-end justify-between gap-4">
          <div>
            <h2 className="font-mono text-xl font-black tracking-widest uppercase md:text-3xl">
              {data.brandName || "Brand Kit"}
            </h2>
            <p className="text-muted-foreground mt-2 font-mono text-[10px] tracking-widest uppercase">
              Editorial Guidelines
            </p>
          </div>
          {headerAction}
        </div>

        <div className="mb-12 h-px w-full bg-white/10" />

        {/* Editorial Grid Layout */}
        <div className="flex flex-col gap-12">
          {/* HERO SECTION: Logo Variations */}
          {data.logoVariations && data.logoVariations.length > 0 ? (
            <FocusWrapper
              id="logo-variations"
              className="w-full"
              refiningSectionId={refiningSectionId}
              isMobile={isMobile}
              anyRefining={anyRefining}
              targetSectionId={targetSectionId}
            >
              <LogoVariationsSection variations={data.logoVariations} />
            </FocusWrapper>
          ) : null}

          {/* SUPPORT ROW: Typography & Palette */}
          <div className="flex flex-col gap-12">
            <FocusWrapper
              id="typography"
              className="w-full"
              refiningSectionId={refiningSectionId}
              isMobile={isMobile}
              anyRefining={anyRefining}
              targetSectionId={targetSectionId}
            >
              <TypographySection
                pairing={data.typography}
                brandName={data.brandName}
                onFontChange={onFontChange}
                isSaving={isSavingEdit}
              />
            </FocusWrapper>

            <FocusWrapper
              id="color-palette"
              className="w-full"
              refiningSectionId={refiningSectionId}
              isMobile={isMobile}
              anyRefining={anyRefining}
              targetSectionId={targetSectionId}
            >
              <ColorPaletteSection
                colors={data.colorPalette}
                onPaletteChange={onPaletteChange}
                isSaving={isSavingEdit}
              />
            </FocusWrapper>
          </div>

          {/* SECONDARY GRID: Deliverables */}
          <div className="grid grid-cols-1 gap-8 md:grid-cols-2 lg:grid-cols-3">
            {data.brandPresentation ? (
              <FocusWrapper
                id="brand-presentation"
                className="md:col-span-2 lg:col-span-3"
                refiningSectionId={refiningSectionId}
                isMobile={isMobile}
                anyRefining={anyRefining}
              >
                <BrandPresentationSection data={data} />
              </FocusWrapper>
            ) : null}

            {data.brandGraphics || data.brandedBackdrops ? (
              <FocusWrapper
                id="brand-graphics"
                className="w-full md:col-span-2 lg:col-span-3"
                refiningSectionId={refiningSectionId}
                isMobile={isMobile}
                anyRefining={anyRefining}
              >
                <BrandGraphicsSection
                  data={
                    data.brandGraphics ?? {
                      backdropPostUrl: data.brandedBackdrops!.feedUrl,
                      backdropStoryUrl: data.brandedBackdrops!.storyUrl,
                    }
                  }
                />
              </FocusWrapper>
            ) : null}

            {data.socialMedia && data.socialMedia.length > 0 ? (
              <FocusWrapper
                id="social-media"
                className="md:col-span-2 lg:col-span-3"
                refiningSectionId={refiningSectionId}
                isMobile={isMobile}
                anyRefining={anyRefining}
              >
                <SocialMediaSection assets={data.socialMedia} />
              </FocusWrapper>
            ) : null}

            {data.businessCard ? (
              <FocusWrapper
                id="business-card"
                className="w-full md:col-span-2 lg:col-span-3"
                refiningSectionId={refiningSectionId}
                isMobile={isMobile}
                anyRefining={anyRefining}
              >
                <BusinessCardSection card={data.businessCard} />
              </FocusWrapper>
            ) : null}

            {data.favicons && data.favicons.length > 0 ? (
              <FocusWrapper
                id="favicon"
                className="w-full md:col-span-2 lg:col-span-3"
                refiningSectionId={refiningSectionId}
                isMobile={isMobile}
                anyRefining={anyRefining}
              >
                <FaviconSection
                  icons={data.favicons}
                  brandName={data.brandName}
                />
              </FocusWrapper>
            ) : null}

            {data.brandGuidelines ? (
              <FocusWrapper
                id="brand-guidelines"
                className="w-full md:col-span-2 lg:col-span-3"
                refiningSectionId={refiningSectionId}
                isMobile={isMobile}
                anyRefining={anyRefining}
              >
                <BrandGuidelinesSection data={data} />
              </FocusWrapper>
            ) : null}
          </div>
        </div>
      </div>
    </BrandKitSectionContext.Provider>
  );
}
