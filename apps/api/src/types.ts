import type { D1Database, Queue } from "@cloudflare/workers-types";
import type { Database, User, Session } from "@quicklogo/db";
import type { GenerateImageMessage } from "@quicklogo/shared";

export type Bindings = {
  DB: D1Database;
  GENERATION_QUEUE: Queue<GenerateImageMessage>;
  CLIENT_URL: string;
  GOOGLE_CLIENT_ID: string;
  GOOGLE_CLIENT_SECRET: string;
  BETTER_AUTH_SECRET: string;
  BETTER_AUTH_URL: string;
  IMAGEKIT_PRIVATE_KEY: string;
  IMAGEKIT_URL_ENDPOINT: string;
  DODO_PAYMENTS_API_KEY: string;
  DODO_PAYMENTS_WEBHOOK_KEY: string;
  DODO_PAYMENTS_ENVIRONMENT: string;
  ALLOWED_ORIGINS: string;
};

export type Variables = {
  db: Database;
  user: User;
  session: Session;
};
