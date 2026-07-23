import { createApiClient } from "@quicklogo/api-client";
import { API_URL } from "../config/api";

export const api = createApiClient(API_URL, {
  init: { credentials: "include" as const },
});
