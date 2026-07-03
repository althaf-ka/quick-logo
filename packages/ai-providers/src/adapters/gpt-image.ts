import type { ModelAdapter } from "./index";

export class GptImageAdapter implements ModelAdapter {
  applyParams(input: Record<string, unknown>): void {
    // Force quality to 'low' to hit the $0.013 pricing tier instead of the default $0.13
    input.quality = "low";
  }
}
