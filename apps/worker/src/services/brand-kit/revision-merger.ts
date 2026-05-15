import { buildBrandKitRefinementRequest } from "@quicklogo/ai-providers/prompt";
import { resolveTypographyStyle } from "./typography-resolver";
import { normalizeTypographyOutput } from "./typography-normalizer";
import { runVisionTypographyRequest } from "./vision-analysis";
import { extractWorkersAiResponseText } from "../../core/ai-response-parser";

export async function mergeRevisionResults({
  ai,
  sectionId,
  refinementPrompt,
  currentBrandKit,
  activeRevisionResults,
}: {
  ai: Ai;
  sectionId: string;
  refinementPrompt: string;
  currentBrandKit: any;
  activeRevisionResults: any;
}) {
  let newMergedJSON = { ...activeRevisionResults };

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
    const logoUrl =
      newMergedJSON.logoVariations?.[0]?.url || currentBrandKit?.customLogoUrl;

    if (logoUrl) {
      const typographyStyle = currentBrandKit?.typographyStyle ?? "";
      const { key: resolvedStyle, hint: styleHint } =
        resolveTypographyStyle(typographyStyle);

      const visionResponse = await runVisionTypographyRequest({
        ai,
        brandName:
          currentBrandKit?.brandName || newMergedJSON.brandName || "Brand",
        description:
          currentBrandKit?.prompt ||
          newMergedJSON.brandName ||
          "Brand identity",
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
            "[revision-merger] AI suggest typography parse failed; keeping current",
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
        `[revision-merger] Refinement for ${sectionId} is not text-LLM driven yet.`,
      );
    } else {
      const response = await ai.run(
        "@cf/meta/llama-3.1-8b-instruct-fp8",
        refinementRequest.request,
      );

      const responseText = extractWorkersAiResponseText(response);

      let aiOutput;
      try {
        aiOutput = JSON.parse(responseText);
      } catch (e) {
        console.error(
          "[revision-merger] Failed to parse Refinement JSON:",
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

  return newMergedJSON;
}
