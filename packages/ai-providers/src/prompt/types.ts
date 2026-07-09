export interface NormalizedSocials {
  instagram?: string;
  twitter?: string;
  linkedin?: string;
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
  frontDetail?: ContactDetail;
  backDetails: ContactDetail[];
}

export type LogoVariationKind = "dark-mode" | "icon-only";
export type SocialMediaVariationKind =
  | "social-profile"
  | "master-banner"
  | "facebook-banner";
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

export interface BrandKitVisionMessage {
  role: "system" | "user";
  content:
    | string
    | Array<
        | { type: "text"; text: string }
        | { type: "image_url"; image_url: { url: string } }
      >;
}

export interface BrandKitVisionRequest {
  messages: BrandKitVisionMessage[];
  max_tokens?: number;
  response_format?: { type: "json_object" };
}
