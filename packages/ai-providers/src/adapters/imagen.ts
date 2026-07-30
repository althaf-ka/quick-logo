import type { ModelAdapter } from "./index";

export class ImagenAdapter implements ModelAdapter {
  applyParams(input: Record<string, unknown>): void {
    input.image_size = "1K";
  }
}
