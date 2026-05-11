import { useEffect } from "react";

const loadedFonts = new Set<string>();

function buildGoogleFontsUrl(families: string[]) {
  const familyParams = families
    .map((family) => `family=${encodeURIComponent(family)}:wght@400;500;700`)
    .join("&");

  return `https://fonts.googleapis.com/css2?${familyParams}&display=swap`;
}

export function useGoogleFontLoader(fontFamily: string | undefined) {
  useEffect(() => {
    if (!fontFamily) return;
    preloadGoogleFonts([fontFamily]);
  }, [fontFamily]);
}

export function preloadGoogleFonts(families: string[]) {
  if (typeof document === "undefined") return;

  const toLoad = families
    .map((family) => family.trim())
    .filter((family) => family.length > 0 && !loadedFonts.has(family));

  if (toLoad.length === 0) return;

  toLoad.forEach((family) => loadedFonts.add(family));

  const link = document.createElement("link");
  link.rel = "stylesheet";
  link.href = buildGoogleFontsUrl(toLoad);
  document.head.appendChild(link);
}
