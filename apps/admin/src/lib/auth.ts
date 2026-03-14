import { createClient } from "@quicklogo/auth/client";

export const authClient = createClient(import.meta.env.VITE_API_URL ?? "");

export const { signIn, signOut, useSession } = authClient;
