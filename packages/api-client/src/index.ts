import type { UserType, AuthType } from "@quicklogo/api/route-types";
import { hc } from "hono/client";

export const createApiClient = (
  baseUrl: string,
  options?: Parameters<typeof hc>[1],
) => ({
  user: hc<UserType>(`${baseUrl}/api/user`, options),
  auth: hc<AuthType>(`${baseUrl}/api/auth`, options),
});

export type ApiClient = ReturnType<typeof createApiClient>;
export type { InferRequestType, InferResponseType } from "hono/client";
