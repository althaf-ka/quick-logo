import { z } from "zod";
import { MODEL_IDS, MODELS } from "../constants/models";

const modelIds = [...MODEL_IDS] as [string, ...string[]];

// ── Frontend form schema (includes File/preview fields for UI) ──────

export const generateConfigSchema = z
  .object({
    model: z.enum(modelIds),
    style: z.string(),
    nativeStyle: z.string().optional().default(""),
    industry: z.string().optional().default(""),
    brandName: z.string().max(100).optional().default(""),
    imageCount: z.union([z.literal(1), z.literal(2), z.literal(4)]),
    colorPalette: z.string(),
    customColors: z
      .array(z.string().regex(/^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/))
      .max(5),
    negativePrompt: z.string().max(500).optional().default(""),
    background: z.enum(["black", "white", "custom"]),
    customBgColor: z.string(),
    referenceImage: z
      .custom<File>(
        (val) => val instanceof File || typeof val === "object",
        "Please attach a valid file",
      )
      .nullable(),
    referenceImagePreview: z.string().nullable(),
    magicPrompt: z.boolean(),
  })
  .refine(
    (data) => {
      if (data.referenceImage) {
        const model = MODELS.find((m) => m.id === data.model);
        return model?.supportsReferenceImage === true;
      }
      return true;
    },
    {
      message: "The selected model does not support reference images.",
      path: ["referenceImage"],
    },
  );

export const generateRequestSchema = z.object({
  prompt: z.string().min(1, "Prompt is required"),
  config: generateConfigSchema,
});

// ── API schema (server-side, no File objects, sensible defaults) ─────

const hexColor = z.string().regex(/^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/);

export const generateApiConfigSchema = z
  .object({
    model: z.enum(modelIds),
    industry: z.string().optional().default(""),
    brandName: z.string().max(100).optional().default(""),
    imageCount: z.union([z.literal(1), z.literal(2), z.literal(4)]).default(1),
    style: z.string().optional().default(""),
    nativeStyle: z.string().optional().default(""),
    colorPalette: z.string().optional().default("auto"),
    customColors: z.array(hexColor).max(5).optional(),
    negativePrompt: z.string().max(500).optional(),
    background: z
      .enum(["black", "white", "custom"])
      .optional()
      .default("white"),
    customBgColor: z.string().optional().default("#ffffff"),
    referenceImageUrl: z.url().optional(),
    magicPrompt: z.boolean().optional().default(true),
    canvasMode: z
      .enum(["edit", "img2img", "inpaint", "text2img"])
      .optional()
      .default("edit"),
    maskImageUrl: z.url().optional(),
    canvasImageUrl: z.url().optional(),
  })
  .refine(
    (data) => {
      if (data.referenceImageUrl || data.canvasMode === "img2img") {
        const model = MODELS.find((m) => m.id === data.model);
        return model?.supportsReferenceImage === true;
      }
      return true;
    },
    {
      message: "The selected model does not support reference images.",
      path: ["model"],
    },
  )
  .refine(
    (data) => {
      if (data.canvasMode === "inpaint") {
        const model = MODELS.find((m) => m.id === data.model);
        return model?.supportsInpaint === true;
      }
      return true;
    },
    {
      message: "The selected model does not support inpainting.",
      path: ["model"],
    },
  );

export const generateApiRequestSchema = z.object({
  prompt: z.string().min(1, "Prompt is required"),
  config: generateApiConfigSchema,
});

export const editApiConfigSchema = z
  .object({
    model: z.enum(modelIds),
    imageCount: z.union([z.literal(1), z.literal(2), z.literal(4)]).default(1),
    referenceImageUrl: z.url().optional(),
    magicPrompt: z.boolean().optional().default(true),
    canvasMode: z
      .enum(["edit", "img2img", "inpaint", "text2img"])
      .optional()
      .default("edit"),
    maskImageUrl: z.url().optional(),
    canvasImageUrl: z.url().optional(),
    negativePrompt: z.string().max(500).optional(),
    style: z.string().optional().default(""),
    nativeStyle: z.string().optional().default(""),
  })
  .refine(
    (data) => {
      if (data.referenceImageUrl || data.canvasMode === "img2img") {
        const model = MODELS.find((m) => m.id === data.model);
        return model?.supportsReferenceImage === true;
      }
      return true;
    },
    {
      message: "The selected model does not support reference images.",
      path: ["model"],
    },
  )
  .refine(
    (data) => {
      if (data.canvasMode === "inpaint") {
        const model = MODELS.find((m) => m.id === data.model);
        return model?.supportsInpaint === true;
      }
      return true;
    },
    {
      message: "The selected model does not support inpainting.",
      path: ["model"],
    },
  );

export const editApiRequestSchema = z.object({
  prompt: z.string().min(1, "Prompt is required"),
  config: editApiConfigSchema,
  sourceImageId: z.string().min(1, "Source image ID is required"),
});

export type GenerateConfig = z.infer<typeof generateConfigSchema>;
export type GenerateRequest = z.infer<typeof generateRequestSchema>;
export type GenerateApiConfig = z.infer<typeof generateApiConfigSchema>;
export type GenerateApiRequest = z.infer<typeof generateApiRequestSchema>;
export type EditApiRequest = z.infer<typeof editApiRequestSchema>;
