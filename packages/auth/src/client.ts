// ── Used by apps/web only ──

import { createAuthClient } from "better-auth/client";
import { adminClient } from "better-auth/client/plugins";

export function createClient(baseURL: string) {
  return createAuthClient({
    baseURL,
    user: {
      additionalFields: {
        credits: {
          type: "number",
        },
      },
    },
    plugins: [adminClient()],
  });
}

// ── Named exports for clean usage ──
export type { Session, User } from "better-auth/client";
