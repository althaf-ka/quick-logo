import type { ModelAdapter } from "./index";
import type { GenerationParams } from "../types";

export class FluxAdapter implements ModelAdapter {
  constructor(private isFill: boolean = false) {}

  applyParams(input: Record<string, unknown>, params: GenerationParams): void {
    if (this.isFill) {
      input.output_format = "png";
    }
    input.prompt_upsampling = params.magicPrompt !== false;
  }
}
