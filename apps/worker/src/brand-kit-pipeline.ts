import type { Database } from "@quicklogo/db";
import {
  brandKits,
  brandKitRevisions,
  images,
  eq,
  ne,
  and,
  sql,
  desc,
} from "@quicklogo/db";
import {
  createProvider,
  getModelMapping,
} from "@quicklogo/ai-providers/providers";
import {
  buildBrandKitIdentityRequest,
  buildBrandKitRefinementRequest,
  buildBrandKitTypographyRequest,
  buildLogoVariationGenerationParams,
  buildLogoStyleAnalysisRequest,
  buildSocialMediaGenerationParams,
  buildBusinessCardGenerationParams,
} from "@quicklogo/ai-providers/prompt";
import type { GenerationParams } from "@quicklogo/ai-providers/types";
import type { StorageProvider } from "@quicklogo/storage";
import type {
  GenerateBrandKitMessage,
  RefineBrandKitMessage,
} from "@quicklogo/shared";
import { TYPOGRAPHY_REGISTRY } from "@quicklogo/shared";
import type { Env } from "./types";

const LOGO_VARIATION_TIMEOUT_MS = 120000;
const FALLBACK_TYPOGRAPHY = {
  heading: { name: "Inter", family: "Inter", weight: "700" },
  body: { name: "Roboto", family: "Roboto", weight: "400" },
};

/**
 * Cloudflare Workers AI requires accepting the Meta Community License
 * for Llama 3.2 Vision before the model can be used.
 * This flag ensures the agreement is sent only once per worker lifecycle.
 */
let visionModelLicenseAccepted = false;

interface LogoVariationResult {
  id: string;
  url: string;
}

/**
 * Robustly extracts the JSON or text content from various Workers AI response formats.
 * Handles legacy formats, OpenAI-compatible formats, and "thinking" models
 * that use 'reasoning' or 'reasoning_content' fields.
 */
function extractWorkersAiResponseText(response: unknown): string {
  if (!response) return "{}";

  if (typeof response === "string") {
    return cleanAiResponse(response);
  }

  if (typeof response === "object" && response !== null) {
    const res = response as Record<string, any>;

    // 1. OpenAI-compatible format (choices array)
    if (Array.isArray(res.choices) && res.choices.length > 0) {
      const message = res.choices[0].message || {};

      // Check content, reasoning_content, and reasoning (some gemma models use this)
      const rawContent =
        message.content || message.reasoning_content || message.reasoning || "";

      if (typeof rawContent === "string" && rawContent.length > 0) {
        return cleanAiResponse(rawContent);
      }
    }

    // 2. Standard legacy Workers AI format
    if ("response" in res && typeof res.response === "string") {
      return cleanAiResponse(res.response);
    }

    if ("result" in res && typeof res.result === "string") {
      return cleanAiResponse(res.result);
    }
  }

  return "{}";
}

/**
 * Cleans an AI response string by removing markdown code blocks and
 * extracting the first valid JSON object if present.
 */
function cleanAiResponse(text: string): string {
  let cleaned = text.trim();

  // Remove markdown code blocks if present (e.g., ```json ... ```)
  cleaned = cleaned.replace(/^```(?:json)?\s*([\s\S]*?)\s*```$/g, "$1");

  // If the string still contains potential JSON, try to extract the outermost {} block
  const jsonMatch = cleaned.match(/\{[\s\S]*\}/);
  if (jsonMatch) {
    return jsonMatch[0].trim();
  }

  return cleaned;
}

const STYLE_ALIASES: Record<string, string> = {
  playful: "playful-display",
  tech: "tech-mono",
  mono: "tech-mono",
  modern: "modern-sans",
  classic: "classic-serif",
  serif: "classic-serif",
  elegant: "elegant-script",
  script: "elegant-script",
  bold: "bold-impact",
  impact: "bold-impact",
  round: "friendly-round",
  luxury: "luxury-minimal",
  premium: "luxury-minimal",
};

function resolveTypographyStyle(style: string): {
  key: string;
  hint: string;
} {
  const key = Object.entries(STYLE_ALIASES).reduce<string>(
    (acc, [alias, resolved]) =>
      style.toLowerCase().includes(alias) ? resolved : acc,
    "modern-sans",
  );

  const entry = TYPOGRAPHY_REGISTRY[key];
  const hint = entry
    ? `${entry.label}: ${entry.description}`
    : "Clean, minimal, and highly legible";

  return { key, hint };
}

function normalizeTypographyOutput(response: unknown) {
  const parsed = response as {
    heading?: { family?: unknown; weight?: unknown; name?: unknown };
    body?: { family?: unknown; weight?: unknown; name?: unknown };
  };

  if (
    typeof parsed.heading?.family !== "string" ||
    typeof parsed.body?.family !== "string"
  ) {
    return FALLBACK_TYPOGRAPHY;
  }

  const headingFamily = parsed.heading.family.trim();
  const bodyFamily = parsed.body.family.trim();

  if (!headingFamily || !bodyFamily) {
    return FALLBACK_TYPOGRAPHY;
  }

  return {
    heading: {
      name:
        typeof parsed.heading.name === "string"
          ? parsed.heading.name
          : headingFamily,
      family: headingFamily,
      weight:
        typeof parsed.heading.weight === "string"
          ? parsed.heading.weight
          : "700",
    },
    body: {
      name:
        typeof parsed.body.name === "string" ? parsed.body.name : bodyFamily,
      family: bodyFamily,
      weight:
        typeof parsed.body.weight === "string" ? parsed.body.weight : "400",
    },
  };
}

export class BrandKitPipeline {
  constructor(
    private ai: Ai,
    private db: Database,
    private storage: StorageProvider,
    private env: Env,
  ) {}

  async processGeneration(message: GenerateBrandKitMessage) {
    const {
      brandKitId,
      prompt,
      brandName,
      extractedColors,
      typographyStyle,
      deliverables,
    } = message;
    await this.updateStatus(brandKitId, "processing");

    try {
      const requestConfig = buildBrandKitIdentityRequest({
        brandName,
        description: prompt,
        extractedColors,
      });

      let actualLogoUrl = message.customLogoUrl;

      if (!actualLogoUrl && message.sourceImageId) {
        const sourceImage = await this.db.query.images.findFirst({
          where: eq(images.id, message.sourceImageId),
        });
        if (sourceImage?.imageUrl) {
          actualLogoUrl = sourceImage.imageUrl;
        }
      }

      const { key: resolvedStyle, hint: styleHint } =
        resolveTypographyStyle(typographyStyle);

      const [colorResponse, typographyResponse] = await Promise.all([
        this.ai.run("@cf/meta/llama-3.1-8b-instruct-fp8", requestConfig),
        actualLogoUrl
          ? this.runVisionTypographyRequest({
              brandName,
              description: prompt,
              typographyStyleHint: styleHint,
              typographyStyleKey: resolvedStyle,
              logoUrl: actualLogoUrl,
            })
          : Promise.resolve(null),
      ]);

      const colorText = extractWorkersAiResponseText(colorResponse);

      let colorOutput;
      try {
        colorOutput = JSON.parse(colorText);
      } catch (e) {
        console.error("[brand-kit-pipeline] Failed to parse JSON:", colorText);
        throw new Error("AI returned invalid JSON");
      }

      let typographyOutput = FALLBACK_TYPOGRAPHY;
      if (typographyResponse) {
        const typographyText = extractWorkersAiResponseText(typographyResponse);

        try {
          typographyOutput = normalizeTypographyOutput(
            JSON.parse(typographyText),
          );
        } catch {
          console.warn(
            "[brand-kit-pipeline] Vision typography parse failed; using fallback",
          );
        }
      }

      const fallbackLogoUrl =
        actualLogoUrl || "https://placehold.co/400x400/000/FFF?text=Logo";

      const finalResultsJSON: Record<string, any> = {
        brandName,
        colorPalette: colorOutput.colorPalette || [],
        typography: typographyOutput,
        deliverables: deliverables,
      };

      let darkAndIconUrls: { darkModeUrl: string; iconOnlyUrl: string } | null = null;
      if (deliverables?.logoVariations || deliverables?.favicon) {
        darkAndIconUrls = actualLogoUrl
          ? await this.generateLogoVariations({
              brandKitId,
              brandName,
              sourceLogoUrl: actualLogoUrl,
            })
          : null;
      }

      if (deliverables?.logoVariations) {
        finalResultsJSON.logoVariations = [
          {
            id: "primary",
            label: "Primary",
            background: "light",
            url: fallbackLogoUrl,
          },
          {
            id: "dark",
            label: "On Dark",
            background: "dark",
            url: darkAndIconUrls?.darkModeUrl ?? fallbackLogoUrl,
          },
          {
            id: "mono",
            label: "Monochrome",
            background: "light",
            url: fallbackLogoUrl,
          },
          {
            id: "icon",
            label: "Icon Only",
            background: "transparent",
            url: darkAndIconUrls?.iconOnlyUrl ?? fallbackLogoUrl,
          },
        ];
      }

      if (deliverables?.socialMedia) {
        const socialMediaUrls = actualLogoUrl
          ? await this.generateSocialMediaAssets({
              brandKitId,
              brandName,
              sourceLogoUrl: actualLogoUrl,
            })
          : null;

        finalResultsJSON.socialMedia = [
          {
            platform: "Instagram",
            type: "Profile",
            dimensions: "1080x1080",
            url: socialMediaUrls?.instagramUrl ?? "https://placehold.co/1080x1080/000/FFF?text=IG",
          },
          {
            platform: "Twitter",
            type: "Header",
            dimensions: "1500x500",
            url: socialMediaUrls?.twitterUrl ?? "https://placehold.co/1500x500/000/FFF?text=TW",
          },
        ];
      }
      if (deliverables?.businessCard) {
        const businessCardUrls = actualLogoUrl
          ? await this.generateBusinessCardAssets({
              brandKitId,
              brandName,
              sourceLogoUrl: actualLogoUrl,
            })
          : null;

        finalResultsJSON.businessCard = {
          frontUrl: businessCardUrls?.frontUrl ?? "https://placehold.co/1050x600/000/FFF?text=Front",
          backUrl: businessCardUrls?.backUrl ?? "https://placehold.co/1050x600/FFF/000?text=Back",
        };
      }
      if (deliverables?.favicon) {
        const iconUrl = darkAndIconUrls?.iconOnlyUrl ?? fallbackLogoUrl;
        finalResultsJSON.favicons = [
          {
            size: 16,
            label: "Web",
            url: iconUrl,
          },
          {
            size: 32,
            label: "Web HD",
            url: iconUrl,
          },
          {
            size: 180,
            label: "Apple",
            url: iconUrl,
          },
        ];
      }

      await this.db.batch([
        this.db.insert(brandKitRevisions).values({
          brandKitId,
          isActive: true,
          revisionNumber: 1,
          triggerType: "initial_generation",
          results: finalResultsJSON,
        }),
        this.db
          .update(brandKits)
          .set({ status: "completed" })
          .where(eq(brandKits.id, brandKitId)),
      ]);

      console.log(`[brand-kit-pipeline] Completed brandKitId=${brandKitId}`);
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";
      console.error(
        `[brand-kit-pipeline] Failed brandKitId=${brandKitId}:`,
        error,
      );
      await this.updateStatus(brandKitId, "failed", errorMessage);
    }
  }

  async processRefinement(message: RefineBrandKitMessage) {
    const { brandKitId, sectionId, refinementPrompt } = message;

    try {
      const activeRevision = await this.db.query.brandKitRevisions.findFirst({
        where: and(
          eq(brandKitRevisions.brandKitId, brandKitId),
          eq(brandKitRevisions.isActive, true),
        ),
      });

      if (!activeRevision) throw new Error("No active revision found");

      let newMergedJSON = { ...(activeRevision.results as any) };

      if (
        sectionId === "typography" &&
        refinementPrompt.startsWith("__FONT_OVERRIDE__")
      ) {
        const [, role, family] = refinementPrompt.split(":");

        if ((role === "heading" || role === "body") && family) {
          newMergedJSON.typography = {
            ...newMergedJSON.typography,
            [role]: {
              ...newMergedJSON.typography?.[role],
              family,
              name: family,
            },
          };
        }
      } else if (
        sectionId === "typography" &&
        refinementPrompt === "__AI_SUGGEST_TYPOGRAPHY__"
      ) {
        // Re-run vision model to get fresh AI font suggestions
        const brandKit = await this.db.query.brandKits.findFirst({
          where: eq(brandKits.id, brandKitId),
        });

        const logoUrl =
          newMergedJSON.logoVariations?.[0]?.url || brandKit?.customLogoUrl;

        if (logoUrl) {
          const typographyStyle = brandKit?.typographyStyle ?? "";
          const { key: resolvedStyle, hint: styleHint } =
            resolveTypographyStyle(typographyStyle);

          const visionResponse = await this.runVisionTypographyRequest({
            brandName:
              brandKit?.brandName || newMergedJSON.brandName || "Brand",
            description:
              brandKit?.prompt || newMergedJSON.brandName || "Brand identity",
            typographyStyleHint: styleHint,
            typographyStyleKey: resolvedStyle,
            logoUrl,
          });

          if (visionResponse) {
            const typographyText = extractWorkersAiResponseText(visionResponse);
            try {
              const newTypography = normalizeTypographyOutput(
                JSON.parse(typographyText),
              );
              newMergedJSON.typography = newTypography;
            } catch {
              console.warn(
                "[brand-kit-pipeline] AI suggest typography parse failed; keeping current",
              );
            }
          }
        }
      } else {
        const refinementRequest = buildBrandKitRefinementRequest({
          brandName: newMergedJSON.brandName || "Unknown",
          sectionId,
          refinementPrompt,
          currentResults: newMergedJSON,
        });

        if (!refinementRequest) {
          console.log(
            `[brand-kit-pipeline] Refinement for ${sectionId} is not text-LLM driven yet.`,
          );
        } else {
          const response = await this.ai.run(
            "@cf/meta/llama-3.1-8b-instruct-fp8",
            refinementRequest.request,
          );

          const responseText = extractWorkersAiResponseText(response);

          let aiOutput;
          try {
            aiOutput = JSON.parse(responseText);
          } catch (e) {
            console.error(
              "[brand-kit-pipeline] Failed to parse Refinement JSON:",
              responseText,
            );
            throw new Error("AI returned invalid JSON on refinement");
          }

          if (
            refinementRequest.sectionKey === "colorPalette" &&
            aiOutput.colorPalette
          ) {
            newMergedJSON.colorPalette = aiOutput.colorPalette;
          }
        }
      }

      const [maxRev] = await this.db
        .select({ max: sql<number>`MAX(revision_number)` })
        .from(brandKitRevisions)
        .where(eq(brandKitRevisions.brandKitId, brandKitId));

      await this.db.batch([
        this.db
          .update(brandKitRevisions)
          .set({ isActive: false })
          .where(
            and(
              eq(brandKitRevisions.brandKitId, brandKitId),
              eq(brandKitRevisions.isActive, true),
            ),
          ),

        this.db.insert(brandKitRevisions).values({
          brandKitId,
          isActive: true,
          revisionNumber: (maxRev.max || 0) + 1,
          triggerType: `refine_${sectionId}`,
          results: newMergedJSON,
        }),
      ]);
      console.log(
        `[brand-kit-pipeline] Completed refinement for brandKitId=${brandKitId}`,
      );
    } catch (error) {
      console.error(
        `[brand-kit-pipeline] Refinement failed brandKitId=${brandKitId}:`,
        error,
      );
    }
  }

  private async analyzeLogoStyle(params: {
    brandName: string;
    description: string;
    logoUrl: string;
  }): Promise<string | null> {
    const MODEL = "@cf/meta/llama-3.2-11b-vision-instruct";

    if (!visionModelLicenseAccepted) {
      try {
        await this.ai.run(
          MODEL as any,
          {
            messages: [{ role: "user", content: "agree" }],
            max_tokens: 1,
          } as any,
        );
      } catch {
        // Already accepted or other error — proceed
      }
      visionModelLicenseAccepted = true;
    }

    try {
      const logoResponse = await fetch(params.logoUrl);
      if (!logoResponse.ok)
        throw new Error("Failed to fetch logo for AI analysis");
      const blob = await logoResponse.blob();
      const arrayBuffer = await blob.arrayBuffer();

      let binary = "";
      const bytes = new Uint8Array(arrayBuffer);
      const chunkSize = 8192;
      for (let i = 0; i < bytes.length; i += chunkSize) {
        binary += String.fromCharCode(...bytes.subarray(i, i + chunkSize));
      }

      const base64 = btoa(binary);
      const dataUrl = `data:${blob.type};base64,${base64}`;

      const response = await this.ai.run(
        MODEL as any,
        buildLogoStyleAnalysisRequest({
          brandName: params.brandName,
          description: params.description,
          logoUrl: dataUrl,
        }),
      );
      const text = extractWorkersAiResponseText(response);
      console.log("[brand-kit-pipeline] Logo style analysis:", text);
      return text;
    } catch (error) {
      console.warn("[brand-kit-pipeline] Logo style analysis failed:", error);
      return null;
    }
  }

  private async runVisionTypographyRequest(params: {
    brandName: string;
    description: string;
    typographyStyleHint: string;
    typographyStyleKey?: string;
    logoUrl: string;
  }): Promise<unknown | null> {
    try {
      // Step 1: Analyze logo style via vision model
      const visualAnalysis = await this.analyzeLogoStyle({
        brandName: params.brandName,
        description: params.description,
        logoUrl: params.logoUrl,
      });

      // Step 2: Suggest fonts via text LLM with JSON mode
      const fontRequest = buildBrandKitTypographyRequest({
        ...params,
        visualAnalysis: visualAnalysis ?? undefined,
      });

      const fontResponse = await this.ai.run(
        "@cf/meta/llama-3.1-8b-instruct-fp8",
        fontRequest,
      );

      return fontResponse;
    } catch (error) {
      console.warn(
        "[brand-kit-pipeline] Typography generation failed; using fallback",
        error,
      );
      return null;
    }
  }

  private async updateStatus(
    id: string,
    status: "processing" | "failed",
    error?: string,
  ) {
    await this.db
      .update(brandKits)
      .set({ status, errorMessage: error || null })
      .where(eq(brandKits.id, id));
  }

  private async generateLogoVariations({
    brandKitId,
    brandName,
    sourceLogoUrl,
  }: {
    brandKitId: string;
    brandName: string;
    sourceLogoUrl: string;
  }): Promise<{ darkModeUrl: string; iconOnlyUrl: string }> {
    const reusableUrls = await this.findReusableLogoVariationUrls({
      brandKitId,
      sourceLogoUrl,
    });
    if (reusableUrls) {
      console.log(
        `[brand-kit-pipeline] Reused logo variations for brandKitId=${brandKitId}`,
      );
      return reusableUrls;
    }

    const mapping = getModelMapping("quick-nano-banana");
    const provider = createProvider(mapping, { ai: this.ai, env: this.env });

    const [darkModeUrl, iconOnlyUrl] = await Promise.all([
      this.generateVariationWithFallback({
        provider,
        params: buildLogoVariationGenerationParams({
          variation: "dark-mode",
          brandName,
          sourceLogoUrl,
          backendModel: mapping.backendModel,
          defaultParams: mapping.defaultParams,
        }),
        brandKitId,
        suffix: "logo-dark",
        fallbackUrl: sourceLogoUrl,
      }),
      this.generateVariationWithFallback({
        provider,
        params: buildLogoVariationGenerationParams({
          variation: "icon-only",
          brandName,
          sourceLogoUrl,
          backendModel: mapping.backendModel,
          defaultParams: mapping.defaultParams,
        }),
        brandKitId,
        suffix: "logo-icon",
        fallbackUrl: sourceLogoUrl,
      }),
    ]);

    return { darkModeUrl, iconOnlyUrl };
  }

  private async generateSocialMediaAssets({
    brandKitId,
    brandName,
    sourceLogoUrl,
  }: {
    brandKitId: string;
    brandName: string;
    sourceLogoUrl: string;
  }): Promise<{ instagramUrl: string; twitterUrl: string }> {
    const mapping = getModelMapping("quick-nano-banana");
    const provider = createProvider(mapping, { ai: this.ai, env: this.env });

    const [instagramUrl, twitterUrl] = await Promise.all([
      this.generateVariationWithFallback({
        provider,
        params: buildSocialMediaGenerationParams({
          variation: "instagram-profile",
          brandName,
          sourceLogoUrl,
          backendModel: mapping.backendModel,
          defaultParams: mapping.defaultParams,
        }),
        brandKitId,
        suffix: "social-instagram",
        fallbackUrl: sourceLogoUrl,
      }),
      this.generateVariationWithFallback({
        provider,
        params: buildSocialMediaGenerationParams({
          variation: "twitter-header",
          brandName,
          sourceLogoUrl,
          backendModel: mapping.backendModel,
          defaultParams: mapping.defaultParams,
        }),
        brandKitId,
        suffix: "social-twitter",
        fallbackUrl: sourceLogoUrl,
      }),
    ]);

    return { instagramUrl, twitterUrl };
  }

  private async generateBusinessCardAssets({
    brandKitId,
    brandName,
    sourceLogoUrl,
  }: {
    brandKitId: string;
    brandName: string;
    sourceLogoUrl: string;
  }): Promise<{ frontUrl: string; backUrl: string }> {
    const mapping = getModelMapping("quick-nano-banana");
    const provider = createProvider(mapping, { ai: this.ai, env: this.env });

    const [frontUrl, backUrl] = await Promise.all([
      this.generateVariationWithFallback({
        provider,
        params: buildBusinessCardGenerationParams({
          variation: "front",
          brandName,
          sourceLogoUrl,
          backendModel: mapping.backendModel,
          defaultParams: mapping.defaultParams,
        }),
        brandKitId,
        suffix: "business-card-front",
        fallbackUrl: sourceLogoUrl,
      }),
      this.generateVariationWithFallback({
        provider,
        params: buildBusinessCardGenerationParams({
          variation: "back",
          brandName,
          sourceLogoUrl,
          backendModel: mapping.backendModel,
          defaultParams: mapping.defaultParams,
        }),
        brandKitId,
        suffix: "business-card-back",
        fallbackUrl: sourceLogoUrl,
      }),
    ]);

    return { frontUrl, backUrl };
  }

  private async findReusableLogoVariationUrls({
    brandKitId,
    sourceLogoUrl,
  }: {
    brandKitId: string;
    sourceLogoUrl: string;
  }): Promise<{ darkModeUrl: string; iconOnlyUrl: string } | null> {
    const currentBrandKit = await this.db.query.brandKits.findFirst({
      where: eq(brandKits.id, brandKitId),
    });
    if (!currentBrandKit) return null;

    const candidates = await this.db
      .select({ results: brandKitRevisions.results })
      .from(brandKitRevisions)
      .innerJoin(brandKits, eq(brandKitRevisions.brandKitId, brandKits.id))
      .where(
        and(
          eq(brandKits.userId, currentBrandKit.userId),
          ne(brandKits.id, brandKitId),
          eq(brandKits.status, "completed"),
          eq(brandKitRevisions.isActive, true),
        ),
      )
      .orderBy(desc(brandKitRevisions.createdAt))
      .limit(25);

    for (const candidate of candidates) {
      const reusableUrls = this.extractReusableLogoVariationUrls(
        candidate.results,
        sourceLogoUrl,
      );
      if (reusableUrls) return reusableUrls;
    }

    return null;
  }

  private extractReusableLogoVariationUrls(
    results: unknown,
    sourceLogoUrl: string,
  ): { darkModeUrl: string; iconOnlyUrl: string } | null {
    if (typeof results !== "object" || results === null) return null;

    const logoVariations = (results as { logoVariations?: unknown })
      .logoVariations;
    if (!Array.isArray(logoVariations)) return null;

    const getUrl = (id: string) => {
      const match = logoVariations.find(
        (variation): variation is LogoVariationResult =>
          typeof variation === "object" &&
          variation !== null &&
          "id" in variation &&
          "url" in variation &&
          (variation as LogoVariationResult).id === id &&
          typeof (variation as LogoVariationResult).url === "string",
      );

      return match?.url;
    };

    const primaryUrl = getUrl("primary");
    const darkModeUrl = getUrl("dark");
    const iconOnlyUrl = getUrl("icon");

    if (primaryUrl !== sourceLogoUrl || !darkModeUrl || !iconOnlyUrl) {
      return null;
    }

    return { darkModeUrl, iconOnlyUrl };
  }

  private async generateVariationWithFallback({
    provider,
    params,
    brandKitId,
    suffix,
    fallbackUrl,
  }: {
    provider: ReturnType<typeof createProvider>;
    params: GenerationParams;
    brandKitId: string;
    suffix: string;
    fallbackUrl: string;
  }): Promise<string> {
    const generation = this.generateAndUploadVariation({
      provider,
      params,
      brandKitId,
      suffix,
    }).catch((error) => {
      console.error(
        `[brand-kit-pipeline] ${suffix} generation failed for brandKitId=${brandKitId}:`,
        error,
      );
      return fallbackUrl;
    });

    let timeoutId: ReturnType<typeof setTimeout> | undefined;
    const timeout = new Promise<string>((resolve) => {
      timeoutId = setTimeout(() => {
        console.warn(
          `[brand-kit-pipeline] ${suffix} generation timed out for brandKitId=${brandKitId}; using source logo fallback`,
        );
        resolve(fallbackUrl);
      }, LOGO_VARIATION_TIMEOUT_MS);
    });

    try {
      return await Promise.race([generation, timeout]);
    } finally {
      if (timeoutId) clearTimeout(timeoutId);
    }
  }

  private async generateAndUploadVariation({
    provider,
    params,
    brandKitId,
    suffix,
  }: {
    provider: ReturnType<typeof createProvider>;
    params: GenerationParams;
    brandKitId: string;
    suffix: string;
  }): Promise<string> {
    const result = await provider.generate(params);
    if (!result.success || !result.imageData) {
      throw new Error(
        result.error ?? `Variation generation failed for "${suffix}"`,
      );
    }

    const uploaded = await this.storage.upload(
      `quick-logo/brand-kits/${brandKitId}/${suffix}.${result.format ?? "png"}`,
      result.imageData,
    );

    return uploaded.url;
  }
}
