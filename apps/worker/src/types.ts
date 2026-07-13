export interface Env {
  DB: D1Database;
  AI: Ai;
  IMAGES: ImagesBinding;
  IMAGEKIT_PRIVATE_KEY: string;
  LEONARDO_API_KEY?: string;
  REPLICATE_API_TOKEN?: string;
  SOCIAL_BANNER_QUALITY?: "low" | "medium" | "high" | "auto";
}
