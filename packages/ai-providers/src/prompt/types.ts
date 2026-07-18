export interface NormalizedSocials {
  instagram?: string;
  twitter?: string;
  linkedin?: string;
  facebook?: string;
  youtube?: string;
  tiktok?: string;
}

export interface NormalizedContact {
  email?: string;
  phone?: string;
  website?: string;
  name?: string;
  title?: string;
  address?: string;
}

export interface ValidatedBrandContext {
  brandName: string;
  colors?: string[];
  tagline?: string;
  industry?: string;
  targetAudience?: string;
  brandPersonality?: string;
  selectedVibes?: string[];
  additionalContext?: string;
  socials: NormalizedSocials;
  contact: NormalizedContact;
  hasSocials: boolean;
  hasContact: boolean;
  hasAnyDetails: boolean;
}

export interface ContactDetail {
  type:
    | "social"
    | "website"
    | "email"
    | "phone"
    | "address"
    | "name"
    | "title"
    | "other";
  label: string;
  value: string;
}

export interface BusinessCardContentStrategy {
  tagline?: string;
  frontDetails: ContactDetail[];
  backDetails: ContactDetail[];
  socialIdentityGroups: Array<{
    identity: string;
    platformLabels: string[];
  }>;
}

export type LogoVariationKind = "dark-mode" | "icon-only";
export type BusinessCardVariationKind = "front" | "back";
export type BrandGraphicVariationKind =
  | "graphic-backdrop-post"
  | "graphic-backdrop-story";
export type BrandKitSectionKey = "colorPalette" | "brandPresentation";

export interface BrandKitMessage {
  role: "system" | "user";
  content: string;
}

export interface BrandKitJsonRequest {
  messages: BrandKitMessage[];
  response_format: { type: "json_object" };
  max_tokens?: number;
}
