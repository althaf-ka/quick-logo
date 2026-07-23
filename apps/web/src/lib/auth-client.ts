import { createClient } from "@quicklogo/auth/client";
import { API_URL } from "../config/api";

export const authClient = createClient(API_URL);

export const { signIn, signOut, useSession } = authClient;
