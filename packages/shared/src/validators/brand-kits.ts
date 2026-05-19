import { z } from "zod";

export const generateBrandKitSchema = z
  .object({
    sourceImageId: z.string().optional(),
    customLogoUrl: z
      .url({ error: "Invalid custom logo URL" })
      .optional()
      .or(z.literal("")),
    brandName: z.string().optional(),
    prompt: z.string().min(1, "Brand description is required"),
    typographyStyle: z.string(), // Input preference (e.g., "modern-sans")
    productImageUrls: z
      .array(z.url({ error: "Invalid product image URL" }))
      .optional(),
    deliverables: z.object({
      logoVariations: z.boolean().optional(),
      socialMedia: z.boolean(),
      businessCard: z.boolean(),
      favicon: z.boolean(),
      brandedBackdrops: z.boolean().optional(),
    }),
    extractedColors: z.array(z.string()),
  })
  .refine((data) => data.sourceImageId || data.customLogoUrl, {
    message: "Either a generated image ID or custom logo URL must be provided",
  })
  .refine(
    (data) => {
      if (
        data.customLogoUrl &&
        !data.sourceImageId &&
        (!data.brandName || data.brandName.trim() === "")
      ) {
        return false;
      }
      return true;
    },
    {
      message: "Brand name is required",
      path: ["brandName"],
    },
  );

export const refineBrandKitSectionSchema = z.object({
  sectionId: z.enum([
    "logo-variations",
    "color-palette",
    "typography",
    "social-media",
    "business-card",
    "favicon",
    "branded-backdrops",
  ]),
  refinementPrompt: z.string().min(1, "Refinement instruction is required"),
  typographyStyle: z.string().optional(), // In case they are refining typography and changed the dropdown
});

export const restoreSectionSchema = z.object({
  sourceRevisionId: z.string(),
  sectionId: z.enum([
    "logo-variations",
    "color-palette",
    "typography",
    "social-media",
    "business-card",
    "favicon",
    "branded-backdrops",
  ]),
});

export const brandKitColorPaletteResponseSchema = z.object({
  colorPalette: z.array(
    z.object({
      hex: z.string(),
      role: z.string(),
      rgb: z.string().optional(),
    }),
  ),
});

export const brandKitTypographyResponseSchema = z.object({
  heading: z.object({
    family: z.string(),
    weight: z.string().optional(),
    name: z.string().optional(),
  }),
  body: z.object({
    family: z.string(),
    weight: z.string().optional(),
    name: z.string().optional(),
  }),
});
