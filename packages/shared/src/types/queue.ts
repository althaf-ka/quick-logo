import type { StructuredBrandContext } from "../utils/brand-kit-context";

export interface GenerateImageMessage {
  type?: "image";
  imageId: string;
  projectId: string;
  userId: string;
  prompt: string;
  isEdit?: boolean;
  config: {
    model: string;
    imageCount: number;
    style?: string;
    colorPalette?: string;
    customColors?: string[];
    negativePrompt?: string;
    background?: "transparent" | "white" | "custom";
    customBgColor?: string;
    referenceImageUrl?: string;
    referenceStrength?: number;
    magicPrompt?: boolean;
    brandName?: string;
    canvasMode?: 'edit' | 'img2img' | 'inpaint' | 'text2img' | 'sketch2img';
    maskImageUrl?: string;
    canvasImageUrl?: string;
  };
}

export interface GenerateBrandKitMessage extends StructuredBrandContext {
  type: "brand-kit-generate";
  brandKitId: string;
  sourceImageId?: string;
  customLogoUrl?: string;
  brandName: string;
  prompt: string;
  typographyStyle: string;
  productImageUrls?: string[];
  deliverables: {
    logoVariations?: boolean;
    socialMedia: boolean;
    businessCard: boolean;
    favicon: boolean;
    brandedBackdrops?: boolean;
    brandPresentation?: boolean;
    brandGuidelines?: boolean;
  };
  extractedColors: string[];
}

export interface RefineBrandKitMessage {
  type: "brand-kit-refine";
  brandKitId: string;
  sectionId:
    | "logo-variations"
    | "color-palette"
    | "typography"
    | "social-media"
    | "business-card"
    | "favicon"
    | "branded-backdrops"
    | "brand-presentation"
    | "brand-guidelines"
    | "global";
  refinementPrompt: string;
  typographyStyle?: string;
  targetItemId?: string;
}

export type QueueMessage =
  | GenerateImageMessage
  | GenerateBrandKitMessage
  | RefineBrandKitMessage;
