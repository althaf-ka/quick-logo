import type { Database } from "@quicklogo/db";
import { brandKits, brandKitRevisions, eq, and, sql } from "@quicklogo/db";
import type { GenerateBrandKitMessage, RefineBrandKitMessage } from "@quicklogo/shared";
import type { Env } from "./types";

export class BrandKitPipeline {
  constructor(private ai: Ai, private db: Database, private env: Env) {}

  async processGeneration(message: GenerateBrandKitMessage) {
    const { brandKitId, prompt, brandName, extractedColors, typographyStyle, deliverables } = message;
    await this.updateStatus(brandKitId, "processing");

    try {
      const systemPrompt = `You are an expert brand identity designer. 
Output ONLY valid JSON matching this schema exactly. Do not include any text outside the JSON.
{
  "colorPalette": [{ "hex": "#000000", "role": "Primary", "rgb": "0,0,0" }],
  "typography": { 
    "heading": { "name": "FontName", "family": "FontFamily", "weight": "700" },
    "body": { "name": "FontName", "family": "FontFamily", "weight": "400" }
  }
}
Use the typography style preference "${typographyStyle}" to select appropriate Google Fonts.`;

      const response = await this.ai.run("@cf/meta/llama-3.1-8b-instruct-fp8", {
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: `Brand Name: ${brandName}\nDescription: ${prompt}\nBase Colors: ${extractedColors.join(", ")}` }
        ],
        response_format: { type: "json_object" } 
      });

      const responseText = typeof response === "object" && response !== null && "response" in response
        ? String((response as { response: string }).response).trim()
        : "{}";

      let aiOutput;
      try {
        aiOutput = JSON.parse(responseText);
      } catch (e) {
        console.error("[brand-kit-pipeline] Failed to parse JSON:", responseText);
        throw new Error("AI returned invalid JSON");
      }
      
      const finalResultsJSON = {
         brandName,
         colorPalette: aiOutput.colorPalette || [],
         typography: aiOutput.typography || {},
         // Base variations placeholders, real processing would go here
         logoVariations: [
           { id: "primary", label: "Primary", background: "light" },
           { id: "dark", label: "On Dark", background: "dark" },
           { id: "mono", label: "Monochrome", background: "light" },
           { id: "icon", label: "Icon Only", background: "transparent" },
         ],
         deliverables: deliverables,
      };

      await this.db.transaction(async (tx) => {
        await tx.insert(brandKitRevisions).values({
          brandKitId,
          isActive: true,
          revisionNumber: 1,
          triggerType: "initial_generation",
          results: finalResultsJSON
        });
        await tx.update(brandKits).set({ status: "completed" }).where(eq(brandKits.id, brandKitId));
      });

      console.log(`[brand-kit-pipeline] Completed brandKitId=${brandKitId}`);

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Unknown error";
      console.error(`[brand-kit-pipeline] Failed brandKitId=${brandKitId}:`, error);
      await this.updateStatus(brandKitId, "failed", errorMessage);
    }
  }

  async processRefinement(message: RefineBrandKitMessage) {
    const { brandKitId, sectionId, refinementPrompt, typographyStyle } = message;
    
    // For now we will mock the refinement logic for simplicity since it requires similar LLM parsing
    // but specific to each section. In a real implementation, you'd fetch the active revision,
    // prompt the LLM to refine JUST that section, and merge it.

    // Let's implement a basic version that just creates a new revision with identical data to prove the architecture.
    try {
      const activeRevision = await this.db.query.brandKitRevisions.findFirst({
        where: and(eq(brandKitRevisions.brandKitId, brandKitId), eq(brandKitRevisions.isActive, true))
      });

      if (!activeRevision) throw new Error("No active revision found");

      let newMergedJSON = activeRevision.results as any;

      if (sectionId === "typography" && typographyStyle) {
        // Just mock updating the typography style as a demo
        newMergedJSON = {
          ...newMergedJSON,
          typography: {
            ...newMergedJSON.typography,
            heading: { ...newMergedJSON.typography?.heading, family: typographyStyle }
          }
        };
      }

      await this.db.transaction(async (tx) => {
        await tx.update(brandKitRevisions)
          .set({ isActive: false })
          .where(and(eq(brandKitRevisions.brandKitId, brandKitId), eq(brandKitRevisions.isActive, true)));
          
        const [maxRev] = await tx.select({ max: sql<number>`MAX(revision_number)` })
          .from(brandKitRevisions).where(eq(brandKitRevisions.brandKitId, brandKitId));
          
        await tx.insert(brandKitRevisions).values({
          brandKitId,
          isActive: true,
          revisionNumber: (maxRev.max || 0) + 1,
          triggerType: `refine_${sectionId}`,
          results: newMergedJSON
        });
      });
      console.log(`[brand-kit-pipeline] Completed refinement for brandKitId=${brandKitId}`);
    } catch (error) {
      console.error(`[brand-kit-pipeline] Refinement failed brandKitId=${brandKitId}:`, error);
    }
  }

  private async updateStatus(id: string, status: "processing"|"failed", error?: string) {
    await this.db.update(brandKits).set({ status, errorMessage: error || null }).where(eq(brandKits.id, id));
  }
}
