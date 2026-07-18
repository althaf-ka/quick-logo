import type { ModelAdapter } from "./index";

export class GptImageAdapter implements ModelAdapter {
  applyParams(input: Record<string, unknown>): void {
    // Keep the provider fallback inexpensive; registry options may override it.
    input.quality = "low";
  }
}
