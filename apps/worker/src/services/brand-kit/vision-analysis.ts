import {
  buildBrandKitTypographyRequest,
  buildLogoStyleAnalysisRequest,
} from "@quicklogo/ai-providers/prompt";
import { extractWorkersAiResponseText } from "../../core/ai-response-parser";
import { createLogger } from "@quicklogo/server-telemetry";
import { fetchImageAsDataUrl } from "../../core/bounded-image-fetch";

const logger = createLogger("worker");

export async function analyzeLogoStyle({
  ai,
  brandName,
  description,
  logoUrl,
}: {
  ai: Ai;
  brandName: string;
  description: string;
  logoUrl: string;
}): Promise<string | null> {
  const MODEL = "@cf/meta/llama-3.2-11b-vision-instruct";

  try {
    const dataUrl = await fetchImageAsDataUrl(logoUrl);

    const response = await ai.run(
      MODEL as any,
      buildLogoStyleAnalysisRequest({
        brandName,
        description,
        logoUrl: dataUrl,
      }),
    );
    const text = extractWorkersAiResponseText(response);
    const refusal =
      /(?:can't|cannot|unable to) (?:engage|assist|comply)|sexual|child nudity|explicit content/i.test(
        text,
      );
    if (refusal) {
      logger.warn(
        "Brand logo analysis was declined by the vision safety filter; using typography fallback",
        { prefix: "vision-analysis" },
      );
      return null;
    }

    try {
      const parsed = JSON.parse(text) as { style?: unknown };
      if (parsed.style && typeof parsed.style === "string") {
        return parsed.style;
      }
    } catch {
      // Some Workers AI vision responses ignore JSON mode but still return a
      // useful plain-language style description. Accept bounded prose instead
      // of treating a valid analysis as a pipeline warning.
      const proseStyle = text
        .replace(
          /^(?:the|this)\s+(?:logo|image)\s+(?:is|shows|features)\s*/i,
          "",
        )
        .trim()
        .slice(0, 500);
      if (proseStyle) {
        logger.info("Brand logo analysis returned prose; normalized response", {
          responseLength: text.length,
          prefix: "vision-analysis",
        });
        return proseStyle;
      }
    }

    logger.warn("Logo analysis style parsing failed", {
      responseLength: text.length,
      prefix: "vision-analysis",
    });
    return null;
  } catch (error) {
    logger.warn("Brand logo analysis failed", {
      error: error instanceof Error ? error.message : String(error),
      prefix: "vision-analysis",
    });
    return null;
  }
}

export async function runVisionTypographyRequest({
  ai,
  brandName,
  description,
  typographyStyleHint,
  typographyStyleKey,
  logoUrl,
}: {
  ai: Ai;
  brandName: string;
  description: string;
  typographyStyleHint: string;
  typographyStyleKey?: string;
  logoUrl?: string;
}): Promise<unknown | null> {
  try {
    let finalAnalysis: string | null = null;

    // Fetch visual analysis if we have a logo.
    if (logoUrl) {
      const analysis = await analyzeLogoStyle({
        ai,
        brandName,
        description,
        logoUrl,
      });
      finalAnalysis = analysis || null;
    }

    const fontRequest = buildBrandKitTypographyRequest({
      brandName,
      description,
      typographyStyleHint,
      typographyStyleKey,
      visualAnalysis: finalAnalysis ?? undefined,
    });

    const fontResponse = await ai.run(
      "@cf/meta/llama-3.1-8b-instruct-fp8",
      fontRequest,
    );

    return fontResponse;
  } catch (error) {
    logger.warn("Typography generation failed; using fallback", {
      error,
      prefix: "vision-analysis",
    });
    return null;
  }
}
