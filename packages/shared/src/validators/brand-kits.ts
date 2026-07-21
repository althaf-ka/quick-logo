import { z } from "zod";
import { MAX_BRAND_PRESENTATION_REFERENCE_IMAGES } from "../constants/generate";
import {
  BUSINESS_CARD_CONTACT_FIELDS,
  BUSINESS_CARD_FORMATS,
  BUSINESS_CARD_ORIENTATIONS,
  BUSINESS_CARD_QR_TARGETS,
  BUSINESS_CARD_SOCIAL_PLATFORMS,
  BUSINESS_CARD_STYLES,
  DEFAULT_BUSINESS_CARD_BRIEF,
  isValidBusinessCardQrUrl,
  SOCIAL_BANNER_PURPOSES,
  SOCIAL_BANNER_VISUAL_DIRECTIONS,
} from "../utils/brand-kit-context";

export const brandGuidelinesDepthSchema = z.enum(["essential", "complete"]);

export const brandGuidelinesContentSchema = z.object({
  version: z.literal(1),
  depth: brandGuidelinesDepthSchema,
  missionStatement: z.string().optional(),
  tagline: z.string().optional(),
  personality: z.string().optional(),
  targetAudience: z.string().optional(),
  selectedVibes: z.array(z.string()).optional(),
  industry: z.string().optional(),
  additionalContext: z.string().optional(),
  logoRules: z.object({
    clearSpaceRatio: z.number().positive(),
    minimumDigitalWidth: z.number().int().positive(),
    minimumMarkSize: z.number().int().positive(),
    misuseRules: z.array(z.string()),
  }),
  voice: z
    .object({
      traits: z.array(z.string()),
      dos: z.array(z.string()),
      donts: z.array(z.string()),
    })
    .optional(),
});

export type BrandGuidelinesDepth = z.infer<typeof brandGuidelinesDepthSchema>;
export type BrandGuidelinesContent = z.infer<
  typeof brandGuidelinesContentSchema
>;

export const businessCardBriefSchema = z.object({
  style: z.enum(BUSINESS_CARD_STYLES),
  format: z.enum(BUSINESS_CARD_FORMATS),
  orientation: z.enum(BUSINESS_CARD_ORIENTATIONS),
  includedContactFields: z.array(z.enum(BUSINESS_CARD_CONTACT_FIELDS)),
  includedSocialPlatforms: z.array(z.enum(BUSINESS_CARD_SOCIAL_PLATFORMS)),
  includeQr: z.boolean(),
  qrTarget: z.enum(BUSINESS_CARD_QR_TARGETS),
  customQrValue: z.string().trim().max(500).optional(),
  notes: z.string().trim().max(700).optional(),
});

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
      depth: brandGuidelinesDepthSchema.optional(),
    })
    .optional(),
  socialMediaBrief: z
    .object({
      purpose: z.enum(SOCIAL_BANNER_PURPOSES),
      visualDirection: z.enum(SOCIAL_BANNER_VISUAL_DIRECTIONS),
      message: z.string().trim().max(120).optional(),
      callToAction: z.string().trim().max(40).optional(),
      includeLogo: z.boolean(),
      includeTagline: z.boolean(),
    })
    .optional(),
  businessCardBrief: businessCardBriefSchema.optional(),
  _hydratedAt: z.number().optional(),
});

export const brandKitDeliverablesSchema = z.object({
  logoVariations: z.boolean().optional(),
  socialMedia: z.boolean(),
  businessCard: z.boolean(),
  favicon: z.boolean(),
  brandGraphics: z.boolean().optional(),
  brandPresentation: z.boolean().optional(),
  brandGuidelines: z.boolean().optional(),
});

export type BrandKitDeliverables = z.infer<typeof brandKitDeliverablesSchema>;

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
      .max(MAX_BRAND_PRESENTATION_REFERENCE_IMAGES)
      .optional(),
    deliverables: brandKitDeliverablesSchema,
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
  )
  .superRefine((data, ctx) => {
    if (!data.deliverables.businessCard) return;

    const brief = data.businessCardBrief || DEFAULT_BUSINESS_CARD_BRIEF;
    const contact = data.contact || {};
    const socials = data.socials || {};

    for (const field of brief.includedContactFields) {
      if (!contact[field]?.trim()) {
        ctx.addIssue({
          code: "custom",
          message: `${field.charAt(0).toUpperCase() + field.slice(1)} is selected for the business card but has no value`,
          path: ["contact", field],
        });
      }
    }
    for (const platform of brief.includedSocialPlatforms) {
      if (!socials[platform]?.trim()) {
        ctx.addIssue({
          code: "custom",
          message: `${platform.charAt(0).toUpperCase() + platform.slice(1)} is selected for the business card but has no username`,
          path: ["socials", platform],
        });
      }
    }
    const hasVisibleDetails =
      brief.includedContactFields.length > 0 ||
      brief.includedSocialPlatforms.length > 0;
    if (!hasVisibleDetails) {
      ctx.addIssue({
        code: "custom",
        message:
          "Choose at least one contact detail or configured social profile",
        path: ["businessCardBrief", "includedContactFields"],
      });
    }

    if (!brief.includeQr) return;
    if (brief.qrTarget === "website" && !contact.website?.trim()) {
      ctx.addIssue({
        code: "custom",
        message: "Add a website or choose another QR destination",
        path: ["businessCardBrief", "qrTarget"],
      });
    }
    if (brief.qrTarget === "custom" && !brief.customQrValue?.trim()) {
      ctx.addIssue({
        code: "custom",
        message: "Enter a custom QR destination",
        path: ["businessCardBrief", "customQrValue"],
      });
    } else if (
      brief.qrTarget === "custom" &&
      !isValidBusinessCardQrUrl(brief.customQrValue)
    ) {
      ctx.addIssue({
        code: "custom",
        message: "Enter a complete URL beginning with http:// or https://",
        path: ["businessCardBrief", "customQrValue"],
      });
    }
  });

export const BRAND_KIT_REFINEMENT_SECTION_IDS = [
  "color-palette",
  "typography",
  "social-media",
  "business-card",
  "brand-graphics",
  "brand-presentation",
  "brand-guidelines",
  "global",
] as const;

export type RefinementSectionId =
  (typeof BRAND_KIT_REFINEMENT_SECTION_IDS)[number];

export function isBrandKitRefinementSection(
  sectionId: string,
): sectionId is RefinementSectionId {
  return BRAND_KIT_REFINEMENT_SECTION_IDS.some((id) => id === sectionId);
}

const refineBrandKitSectionBase = z.object({
  sectionId: z.enum(BRAND_KIT_REFINEMENT_SECTION_IDS),
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
            code: "custom",
            message: "Invalid business card target item",
            path: ["targetItemId"],
          });
        }
      } else if (data.sectionId === "brand-graphics") {
        const validItems = ["backdrop-post", "backdrop-story"];
        if (!validItems.includes(data.targetItemId)) {
          ctx.addIssue({
            code: "custom",
            message: "Invalid brand graphics target item",
            path: ["targetItemId"],
          });
        }
      } else if (data.sectionId === "social-media") {
        const validItems = [
          "instagram-profile",
          "twitter-header",
          "linkedin-header",
          "facebook-header",
          "youtube-channel-art",
        ];
        if (!validItems.includes(data.targetItemId)) {
          ctx.addIssue({
            code: "custom",
            message: "Invalid social media target item",
            path: ["targetItemId"],
          });
        }
      } else {
        ctx.addIssue({
          code: "custom",
          message: `Target items are not supported for section: ${data.sectionId}`,
          path: ["targetItemId"],
        });
      }
    }
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
    "brand-graphics",
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

export const brandGuidelinesRefinementResponseSchema = z.object({
  missionStatement: z.string().optional(),
  tagline: z.string().optional(),
  personality: z.string().optional(),
  targetAudience: z.string().optional(),
  industry: z.string().optional(),
  additionalContext: z.string().optional(),
  voice: z
    .object({
      traits: z.array(z.string()),
      dos: z.array(z.string()),
      donts: z.array(z.string()),
    })
    .optional(),
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
  brandGuidelines: brandGuidelinesRefinementResponseSchema.optional(),
});
