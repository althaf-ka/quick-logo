import type {
  UserType,
  AuthType,
  UploadType,
  GenerateType,
  BatchesType,
  ImagesType,
  PaymentsType,
} from "@quicklogo/api/route-types";
import { hc } from "hono/client";

export const createApiClient = (
  baseUrl: string,
  options?: Parameters<typeof hc>[1],
) => ({
  user: hc<UserType>(`${baseUrl}/api/user`, options),
  auth: hc<AuthType>(`${baseUrl}/api/auth`, options),
  upload: hc<UploadType>(`${baseUrl}/api/upload`, options),
  generate: hc<GenerateType>(`${baseUrl}/api/generate`, options),
  batches: hc<BatchesType>(`${baseUrl}/api/batches`, options),
  images: hc<ImagesType>(`${baseUrl}/api/images`, options),
  payments: hc<PaymentsType>(`${baseUrl}/api/payments`, options),
});

export type ApiClient = ReturnType<typeof createApiClient>;
export type { InferRequestType, InferResponseType } from "hono/client";
