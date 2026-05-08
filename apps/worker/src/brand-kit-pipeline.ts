import type { Database } from "@quicklogo/db";
import { brandKits, brandKitRevisions, images, eq, and, sql } from "@quicklogo/db";
import type { GenerateBrandKitMessage, RefineBrandKitMessage } from "@quicklogo/shared";
import type { Env } from "./types";

export class BrandKitPipeline {
  constructor(private ai: Ai, private db: Database, private env: Env) {}

  async processGeneration(message: GenerateBrandKitMessage) {
    const { brandKitId, prompt, brandName, extractedColors, typographyStyle, deliverables } = message;
    await this.updateStatus(brandKitId, "processing");

    try {
      const fontStyleMap: Record<string, string> = {
        "modern-sans": "Modern Sans-Serif (e.g. Inter, Roboto, Poppins, Montserrat)",
        "classic-serif": "Classic Serif (e.g. Merriweather, Playfair Display, Lora)",
        "playful-display": "Playful Display (e.g. Fredoka One, Righteous, Pacifico)",
        "elegant-script": "Elegant Script (e.g. Great Vibes, Dancing Script, Allura)",
        "tech-mono": "Tech Monospace (e.g. JetBrains Mono, Fira Code, Roboto Mono)",
      };
      const typographyInstruction = fontStyleMap[typographyStyle] || "Modern Sans-Serif";

      const systemPrompt = `You are an expert brand identity designer. 
Output ONLY valid JSON matching this schema exactly. Do not include any text outside the JSON.
{
  "colorPalette": [{ "hex": "#000000", "role": "Primary", "rgb": "0,0,0" }],
  "typography": { 
    "heading": { "name": "FontName", "family": "FontFamily", "weight": "700" },
    "body": { "name": "FontName", "family": "FontFamily", "weight": "400" }
  }
}
CRITICAL INSTRUCTION: You MUST select Google Fonts that perfectly match this typography style: ${typographyInstruction}. 
Failure to match the requested style exactly is unacceptable.`;

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
      
      let actualLogoUrl = message.customLogoUrl;
      
      if (!actualLogoUrl && message.sourceImageId) {
        const sourceImage = await this.db.query.images.findFirst({
          where: eq(images.id, message.sourceImageId)
        });
        if (sourceImage?.imageUrl) {
          actualLogoUrl = sourceImage.imageUrl;
        }
      }

      const placeholderLogo = actualLogoUrl || "https://placehold.co/400x400/000/FFF?text=Logo";

      const finalResultsJSON: Record<string, any> = {
         brandName,
         colorPalette: aiOutput.colorPalette || [],
         typography: aiOutput.typography || {},
         deliverables: deliverables,
      };

      if (deliverables?.logoVariations) {
        finalResultsJSON.logoVariations = [
           { id: "primary", label: "Primary", background: "light", url: placeholderLogo },
           { id: "dark", label: "On Dark", background: "dark", url: placeholderLogo },
           { id: "mono", label: "Monochrome", background: "light", url: placeholderLogo },
           { id: "icon", label: "Icon Only", background: "transparent", url: placeholderLogo },
        ];
      }

      if (deliverables?.socialMedia) {
        finalResultsJSON.socialMedia = [
          { platform: "Instagram", type: "Profile", dimensions: "1080x1080", url: "https://placehold.co/1080x1080/000/FFF?text=IG" },
          { platform: "Twitter", type: "Header", dimensions: "1500x500", url: "https://placehold.co/1500x500/000/FFF?text=TW" },
        ];
      }
      if (deliverables?.businessCard) {
        finalResultsJSON.businessCard = {
          frontUrl: "https://placehold.co/1050x600/000/FFF?text=Front",
          backUrl: "https://placehold.co/1050x600/FFF/000?text=Back"
        };
      }
      if (deliverables?.favicon) {
        finalResultsJSON.favicons = [
          { size: 16, label: "Web", url: "https://placehold.co/16x16/000/FFF?text=16" },
          { size: 32, label: "Web HD", url: "https://placehold.co/32x32/000/FFF?text=32" },
          { size: 180, label: "Apple", url: "https://placehold.co/180x180/000/FFF?text=180" },
        ];
      }

      await this.db.batch([
        this.db.insert(brandKitRevisions).values({
          brandKitId,
          isActive: true,
          revisionNumber: 1,
          triggerType: "initial_generation",
          results: finalResultsJSON
        }),
        this.db.update(brandKits).set({ status: "completed" }).where(eq(brandKits.id, brandKitId))
      ]);

      console.log(`[brand-kit-pipeline] Completed brandKitId=${brandKitId}`);

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Unknown error";
      console.error(`[brand-kit-pipeline] Failed brandKitId=${brandKitId}:`, error);
      await this.updateStatus(brandKitId, "failed", errorMessage);
    }
  }

  async processRefinement(message: RefineBrandKitMessage) {
    const { brandKitId, sectionId, refinementPrompt, typographyStyle } = message;
    
    try {
      const activeRevision = await this.db.query.brandKitRevisions.findFirst({
        where: and(eq(brandKitRevisions.brandKitId, brandKitId), eq(brandKitRevisions.isActive, true))
      });

      if (!activeRevision) throw new Error("No active revision found");

      let newMergedJSON = { ...activeRevision.results as any };
      let sectionSchemaStr = "";
      let systemInstruction = "";
      const sectionKey = sectionId === "color-palette" ? "colorPalette" : (sectionId === "typography" ? "typography" : null);

      if (sectionId === "color-palette") {
        sectionSchemaStr = `{ "colorPalette": [{ "hex": "#000000", "role": "Primary", "rgb": "0,0,0" }] }`;
        systemInstruction = "You are refining the color palette of a brand. Keep it cohesive and professional.";
      } else if (sectionId === "typography") {
        const fontStyleMap: Record<string, string> = {
          "modern-sans": "Modern Sans-Serif (e.g. Inter, Roboto, Poppins, Montserrat)",
          "classic-serif": "Classic Serif (e.g. Merriweather, Playfair Display, Lora)",
          "playful-display": "Playful Display (e.g. Fredoka One, Righteous, Pacifico)",
          "elegant-script": "Elegant Script (e.g. Great Vibes, Dancing Script, Allura)",
          "tech-mono": "Tech Monospace (e.g. JetBrains Mono, Fira Code, Roboto Mono)",
        };
        const typographyInstruction = typographyStyle ? (fontStyleMap[typographyStyle] || "Modern Sans-Serif") : "Modern Sans-Serif";
        sectionSchemaStr = `{ "typography": { "heading": { "name": "FontName", "family": "FontFamily", "weight": "700" }, "body": { "name": "FontName", "family": "FontFamily", "weight": "400" } } }`;
        systemInstruction = `You are refining the typography of a brand. \nCRITICAL INSTRUCTION: You MUST select Google Fonts that perfectly match this typography style: ${typographyInstruction}. Failure to match the requested style exactly is unacceptable.`;
      }

      if (sectionSchemaStr && sectionKey) {
        const systemPrompt = `You are an expert brand identity designer.\nOutput ONLY valid JSON matching this schema exactly. Do not include any text outside the JSON.\n${sectionSchemaStr}\n${systemInstruction}`;
        
        const response = await this.ai.run("@cf/meta/llama-3.1-8b-instruct-fp8", {
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: `Brand Name: ${newMergedJSON.brandName || "Unknown"}\nRefinement Request: ${refinementPrompt}\nOriginal JSON state for context: ${JSON.stringify(newMergedJSON[sectionKey])}` }
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
          console.error("[brand-kit-pipeline] Failed to parse Refinement JSON:", responseText);
          throw new Error("AI returned invalid JSON on refinement");
        }

        if (sectionId === "color-palette" && aiOutput.colorPalette) {
          newMergedJSON.colorPalette = aiOutput.colorPalette;
        } else if (sectionId === "typography" && aiOutput.typography) {
          newMergedJSON.typography = aiOutput.typography;
        }
      } else {
        console.log(`[brand-kit-pipeline] Refinement for ${sectionId} is not text-LLM driven yet.`);
      }

      const [maxRev] = await this.db.select({ max: sql<number>`MAX(revision_number)` })
        .from(brandKitRevisions).where(eq(brandKitRevisions.brandKitId, brandKitId));
        
      await this.db.batch([
        this.db.update(brandKitRevisions)
          .set({ isActive: false })
          .where(and(eq(brandKitRevisions.brandKitId, brandKitId), eq(brandKitRevisions.isActive, true))),
          
        this.db.insert(brandKitRevisions).values({
          brandKitId,
          isActive: true,
          revisionNumber: (maxRev.max || 0) + 1,
          triggerType: `refine_${sectionId}`,
          results: newMergedJSON
        })
      ]);
      console.log(`[brand-kit-pipeline] Completed refinement for brandKitId=${brandKitId}`);
    } catch (error) {
      console.error(`[brand-kit-pipeline] Refinement failed brandKitId=${brandKitId}:`, error);
    }
  }

  private async updateStatus(id: string, status: "processing"|"failed", error?: string) {
    await this.db.update(brandKits).set({ status, errorMessage: error || null }).where(eq(brandKits.id, id));
  }
}
