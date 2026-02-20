import { D1Database } from "@cloudflare/workers-types";
import type { Database, User, Session } from "@quicklogo/db";

export type Bindings = {
  DB: D1Database;
  CLIENT_URL: string;
  GOOGLE_CLIENT_ID: string;
  GOOGLE_CLIENT_SECRET: string;
  BETTER_AUTH_SECRET: string;
  BETTER_AUTH_URL: string;
};

export type Variables = {
  db: Database;
  user: User;
  session: Session;
};
