export * from "./queue";

export const BRAND_KIT_REVISION_TYPES = [
  "initial",
  "refinement",
  "section_restore",
  "full_restore",
  "manual_edit",
] as const;

export type BrandKitRevisionType = (typeof BRAND_KIT_REVISION_TYPES)[number];
