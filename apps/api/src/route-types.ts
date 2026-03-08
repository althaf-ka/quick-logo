// ──────────────────────────────────────────────────────────
// ⚠️  TYPES ONLY — zero runtime code
//
// Single source of truth for all API types.
// packages/api-client imports ONLY from this file.
//
// Why keep AuthType/UserType separate from AppType?
// → IDE Performance Fix: split clients only instantiate
//   types for their own routes, not the whole app.
//   See: packages/api-client/src/index.ts
// ──────────────────────────────────────────────────────────

export type { AuthType } from "./routes/auth";
export type { UserType } from "./routes/user";
export type { UploadType } from "./routes/upload";
export type { GenerateType } from "./routes/generate";
export type { BatchesType } from "./routes/batches";
export type { ImagesType } from "./routes/images";
