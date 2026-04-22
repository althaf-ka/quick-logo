// ── Used by apps/api only

import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { admin } from "better-auth/plugins";
import {
  users,
  sessions,
  accounts,
  verifications,
  type Database,
} from "@quicklogo/db";

type AuthEnv = {
  GOOGLE_CLIENT_ID: string;
  GOOGLE_CLIENT_SECRET: string;
  BETTER_AUTH_SECRET: string;
  BETTER_AUTH_URL: string;
  ALLOWED_ORIGINS: string;
};

export function createAuth(db: Database, env: AuthEnv) {
  return betterAuth({
    baseURL: env.BETTER_AUTH_URL,
    secret: env.BETTER_AUTH_SECRET,
    trustedOrigins: (env.ALLOWED_ORIGINS || "").split(",").map((o) => o.trim()),

    onAPIError: {
      errorURL:
        ((env.ALLOWED_ORIGINS || "").split(",")[0] || "").trim() + "/login",
    },

    user: {
      additionalFields: {
        credits: {
          type: "number",
          defaultValue: 0,
        },
        banned: {
          type: "boolean",
          defaultValue: false,
        },
      },
    },

    database: drizzleAdapter(db, {
      provider: "sqlite",
      schema: {
        user: users,
        session: sessions,
        account: accounts,
        verification: verifications,
      },
    }),

    socialProviders: {
      google: {
        clientId: env.GOOGLE_CLIENT_ID,
        clientSecret: env.GOOGLE_CLIENT_SECRET,
      },
    },

    plugins: [
      admin({
        defaultRole: "user",
        adminRoles: ["admin"],
        bannedUserMessage: "Your account has been suspended. Please contact support.",
      }),
    ],

    session: {
      cookieCache: {
        enabled: true,
        maxAge: 60 * 5,
      },
    },
  });
}

export type Auth = ReturnType<typeof createAuth>;
export type AuthConfig = Parameters<typeof createAuth>[1];
