export interface GenerationParams {
  prompt: string;
  negativePrompt?: string;
  backendModel: string;
  style?: string;
  referenceImage?: string;
  referenceStrength?: number;
  steps?: number;
  width?: number;
  height?: number;
  guidance?: number;
}

export interface GenerationResult {
  success: boolean;
  imageData?: Uint8Array;
  format?: "png" | "jpeg" | "webp" | "jpg";
  error?: string;
  metadata?: {
    model: string;
    duration?: number;
  };
}

export interface AIProvider {
  name: string;
  generate(params: GenerationParams): Promise<GenerationResult>;
}
