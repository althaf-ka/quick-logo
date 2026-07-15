import type { ModelAdapter } from "./index";
import type { GenerationParams } from "../types";

export class IdeogramAdapter implements ModelAdapter {
  applyParams(input: Record<string, unknown>, params: GenerationParams): void {
    // Design is the most appropriate base style for logos and branded artwork.
    input.style_type = "Design";

    // The user's selected nativeStyle now maps directly to Ideogram's style_presets
    const preset = params.providerOptions?.nativeStyle as string;
    if (preset && preset !== "NONE" && preset !== "AUTO") {
      input.style_preset = preset;
    }
  }
}
