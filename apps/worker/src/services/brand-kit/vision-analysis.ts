import {
  buildBrandKitTypographyRequest,
  buildLogoStyleAnalysisRequest,
} from "@quicklogo/ai-providers/prompt";
import { extractWorkersAiResponseText } from "../../core/ai-response-parser";

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
    await ai.run(
      MODEL as any,
      {
        messages: [{ role: "user", content: "agree" }],
        max_tokens: 1,
      } as any,
    );
  } catch {
    // Already accepted or other error — proceed
  }

  try {
    const logoResponse = await fetch(logoUrl);
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

    const response = await ai.run(
      MODEL as any,
      buildLogoStyleAnalysisRequest({
        brandName,
        description,
        logoUrl: dataUrl,
      }),
    );
    const text = extractWorkersAiResponseText(response);
    console.log("[vision-analysis] Logo style analysis:", text);
    return text;
  } catch (error) {
    console.warn("[vision-analysis] Logo style analysis failed:", error);
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
  logoUrl: string;
}): Promise<unknown | null> {
  try {
    // Step 1: Analyze logo style via vision model
    const visualAnalysis = await analyzeLogoStyle({
      ai,
      brandName,
      description,
      logoUrl,
    });

    const fontRequest = buildBrandKitTypographyRequest({
      brandName,
      description,
      typographyStyleHint,
      typographyStyleKey,
      visualAnalysis: visualAnalysis ?? undefined,
    });

    const fontResponse = await ai.run(
      "@cf/meta/llama-3.1-8b-instruct-fp8",
      fontRequest,
    );

    return fontResponse;
  } catch (error) {
    console.warn(
      "[vision-analysis] Typography generation failed; using fallback",
      error,
    );
    return null;
  }
}
