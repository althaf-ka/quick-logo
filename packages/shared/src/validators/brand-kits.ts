import { z } from "zod";

export const structuredBrandContextSchema = z.object({
  industry: z.string().optional(),
  tagline: z.string().optional(),
  targetAudience: z.string().optional(),
  selectedVibes: z.array(z.string()).optional(),
  brandPersonality: z.string().optional(),
  additionalContext: z.string().optional(),
  socials: z.record(z.string(), z.string()).optional(),
  contact: z.record(z.string(), z.string()).optional(),
  guidelines: z
    .object({
      depth: z.enum(["essential", "complete"]).optional(),
    })
    .optional(),
  _hydratedAt: z.number().optional(),
});

export const generateBrandKitSchema = z
  .object({
    sourceImageId: z.string().optional(),
    customLogoUrl: z
      .url({ error: "Invalid custom logo URL" })
      .optional()
      .or(z.literal("")),
    brandName: z.string().optional(),
    prompt: z.string().optional(),
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
      brandPresentation: z.boolean().optional(),
      brandGuidelines: z.boolean().optional(),
    }),
    extractedColors: z.array(z.string()),
  })
  .merge(structuredBrandContextSchema)
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

const refineBrandKitSectionBase = z.object({
  sectionId: z.enum([
    "logo-variations",
    "color-palette",
    "typography",
    "social-media",
    "business-card",
    "favicon",
    "branded-backdrops",
    "brand-presentation",
    "brand-guidelines",
    "global",
  ]),
  refinementPrompt: z.string().min(1, "Refinement instruction is required"),
  typographyStyle: z.string().optional(), // In case they are refining typography and changed the dropdown
  targetItemId: z.string().optional(),
});

export const refineBrandKitSectionSchema =
  refineBrandKitSectionBase.superRefine((data, ctx) => {
    if (data.targetItemId) {
      if (data.sectionId === "business-card") {
        if (data.targetItemId !== "front" && data.targetItemId !== "back") {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: "Invalid business card target item",
            path: ["targetItemId"],
          });
        }
      } else if (data.sectionId === "branded-backdrops") {
        if (data.targetItemId !== "feed" && data.targetItemId !== "story") {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: "Invalid branded backdrops target item",
            path: ["targetItemId"],
          });
        }
      } else if (data.sectionId === "social-media") {
        if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(data.targetItemId)) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: "Invalid social media target item format",
            path: ["targetItemId"],
          });
        }
      } else {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: `Target items are not supported for section: ${data.sectionId}`,
          path: ["targetItemId"],
        });
      }
    }
  });

export type RefinementSectionId = z.infer<
  typeof refineBrandKitSectionBase
>["sectionId"];

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
    "brand-presentation",
    "brand-guidelines",
  ]),
});

export type RestoreSectionId = z.infer<
  typeof restoreSectionSchema
>["sectionId"];

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

export const restoreFullBrandKitSchema = z.object({
  sourceRevisionId: z.string(),
});

export const brandKitGlobalRefinementResponseSchema = z.object({
  colorPalette: z
    .array(
      z.object({
        hex: z.string(),
        role: z.string(),
        rgb: z.string().optional(),
      }),
    )
    .optional(),
  brandPresentation: z
    .object({
      tagline: z.string().optional(),
      description: z.string().optional(),
    })
    .optional(),
  typography: brandKitTypographyResponseSchema.optional(),
  brandGuidelines: z
    .object({
      missionStatement: z.string().optional(),
      tagline: z.string().optional(),
      personality: z.string().optional(),
      targetAudience: z.string().optional(),
      industry: z.string().optional(),
      additionalContext: z.string().optional(),
    })
    .optional(),
});
