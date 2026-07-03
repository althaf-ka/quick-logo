import type { ModelAdapter } from "./index";
import type { GenerationParams } from "../types";

export class ImagenAdapter implements ModelAdapter {
  applyParams(input: Record<string, unknown>, _params: GenerationParams): void {
    input.image_size = "1K";
  }
}
