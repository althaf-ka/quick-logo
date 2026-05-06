import { z } from "zod";

export const generateBrandKitSchema = z.object({
  sourceImageId: z.string().optional(),
  customLogoUrl: z.string().optional(),
  brandName: z.string().min(1, "Brand name is required"),
  prompt: z.string().min(1, "Brand description is required"),
  typographyStyle: z.string(), // Input preference (e.g., "modern-sans")
  productImageUrls: z.array(z.string()).optional(),
  deliverables: z.object({
    socialMedia: z.boolean(),
    businessCard: z.boolean(),
    favicon: z.boolean()
  }),
  extractedColors: z.array(z.string()),
}).refine(data => data.sourceImageId || data.customLogoUrl, {
  message: "Either a generated image ID or custom logo URL must be provided",
});

export const refineBrandKitSectionSchema = z.object({
  sectionId: z.enum(["logo-variations", "color-palette", "typography", "social-media", "business-card", "favicon"]),
  refinementPrompt: z.string().min(1, "Refinement instruction is required"),
  typographyStyle: z.string().optional(), // In case they are refining typography and changed the dropdown
});

export const restoreSectionSchema = z.object({
  sourceRevisionId: z.string(),
  sectionId: z.enum(["logo-variations", "color-palette", "typography", "social-media", "business-card", "favicon"]),
});
