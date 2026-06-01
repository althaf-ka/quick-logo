import { createContext, useContext } from "react";

type BrandKitSectionContextValue = {
  targetSectionId?: string | null;
  targetItemId?: string | null;
  refiningSectionId?: string | null;
  cancelRefine?: () => void;
};

export const BrandKitSectionContext =
  createContext<BrandKitSectionContextValue | null>(null);

export function useBrandKitSection() {
  const ctx = useContext(BrandKitSectionContext);
  if (!ctx) {
    throw new Error(
      "useBrandKitSection must be used within <BrandKitResults />",
    );
  }
  return ctx;
}
