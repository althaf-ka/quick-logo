/// <reference types="node" />

import { defineConfig } from "drizzle-kit";
import fs from "node:fs";
import path from "node:path";

function getLocalD1Path(): string {
  const d1Dir = path.resolve(
    __dirname,
    "../../apps/api/.wrangler/state/v3/d1/miniflare-D1DatabaseObject",
  );

  if (!fs.existsSync(d1Dir)) {
    throw new Error(
      [
        "",
        "  Local D1 database not found.",
        "  Run `pnpm dev` in apps/api first.",
        `  Expected: ${d1Dir}`,
        "",
      ].join("\n"),
    );
  }

  const file = fs.readdirSync(d1Dir).find((f) => f.endsWith(".sqlite"));

  if (!file) {
    throw new Error(`No .sqlite file found in: ${d1Dir}`);
  }

  return path.join(d1Dir, file);
}

const isProduction = process.env.NODE_ENV === "production";

if (isProduction) {
  const required = [
    "CLOUDFLARE_ACCOUNT_ID",
    "CLOUDFLARE_DATABASE_ID",
    "CLOUDFLARE_D1_TOKEN",
  ] as const;

  for (const key of required) {
    if (!process.env[key]) {
      throw new Error(`Missing required env var for migration: ${key}`);
    }
  }
}

const base = {
  dialect: "sqlite" as const,
  schema: "./src/entities/index.ts",
  out: "./migrations",
};

export default defineConfig(
  isProduction
    ? {
        ...base,
        driver: "d1-http",
        dbCredentials: {
          accountId: process.env.CLOUDFLARE_ACCOUNT_ID!,
          databaseId: process.env.CLOUDFLARE_DATABASE_ID!,
          token: process.env.CLOUDFLARE_D1_TOKEN!,
        },
      }
    : {
        ...base,
        dbCredentials: {
          url: getLocalD1Path(),
        },
      },
);
