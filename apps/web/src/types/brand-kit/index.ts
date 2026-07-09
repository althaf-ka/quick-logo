import type { StructuredBrandContext } from "@quicklogo/shared";

export type WorkspaceState =
  | "foundation"
  | "creative-direction"
  | "deliverables"
  | "review"
  | "generating"
  | "results"
  | "refining";

export interface BusinessCardConfig {
  layout?: "minimal" | "classic" | "bold";
  includeQr?: boolean;
  name?: string;
  title?: string;
  email?: string;
  phone?: string;
  address?: string;
}

export interface SocialMediaConfig {
  platforms?: string[];
  dimensions?: Record<string, string>;
}

export interface PresentationConfig {
  slidesCount?: number;
  theme?: "dark" | "light" | "dynamic";
}

export interface BrandGuidelinesConfig {
  depth?: "minimal" | "comprehensive";
  toneOfVoice?: string;
  accessibilityRules?: boolean;
}

export interface DeliverableSettings<T = Record<string, unknown>> {
  enabled: boolean;
  config: T;
}

export interface DeliverablesConfig {
  logoVariations: DeliverableSettings<Record<string, unknown>>;
  socialMedia: DeliverableSettings<SocialMediaConfig>;
  businessCard: DeliverableSettings<BusinessCardConfig>;
  favicon: DeliverableSettings<Record<string, unknown>>;
  brandGraphics: DeliverableSettings<Record<string, unknown>>;
  brandPresentation: DeliverableSettings<PresentationConfig>;
  brandGuidelines: DeliverableSettings<BrandGuidelinesConfig>;
}

export interface TypographyPreference {
  mood: string;
  locked: boolean;
  fontPairing?: {
    heading: string;
    body: string;
  };
}

export interface NormalizedBrandKit extends StructuredBrandContext {
  id: string;
  brandName: string;
  logoUrl?: string;
  extractedColors: string[];
  typographyPreference: TypographyPreference;
  deliverables: DeliverablesConfig;
  status: "pending" | "processing" | "completed" | "failed";
  revisions: Array<{
    id: string;
    isActive: boolean;
    results: Record<string, unknown>;
    triggerType: string;
    createdAt: string;
  }>;
}
