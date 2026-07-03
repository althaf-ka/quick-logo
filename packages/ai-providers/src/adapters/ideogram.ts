import type { ModelAdapter } from "./index";
import type { GenerationParams } from "../types";

export class IdeogramAdapter implements ModelAdapter {
  applyParams(input: Record<string, unknown>, params: GenerationParams): void {
    // For logos, DESIGN is objectively the best base style type
    input.style_type = "DESIGN";

    // The user's selected nativeStyle now maps directly to Ideogram's style_presets
    const preset = params.providerOptions?.nativeStyle as string;
    if (preset && preset !== "NONE" && preset !== "AUTO") {
      input.style_preset = preset;
    }
  }
}
