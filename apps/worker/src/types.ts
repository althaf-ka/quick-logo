import type { Database } from "@quicklogo/db";

export interface Env {
  DB: D1Database;
  AI: Ai;
  IMAGEKIT_PRIVATE_KEY: string;
  LEONARDO_API_KEY?: string;
  REPLICATE_API_TOKEN?: string;
}
