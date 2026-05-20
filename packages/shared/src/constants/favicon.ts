export const FAVICON_SIZES = [
  { size: 16, type: "favicon", label: "Web" },
  { size: 32, type: "favicon", label: "Web HD" },
  { size: 180, type: "apple-touch-icon", label: "Apple Touch" },
  { size: 192, type: "android-chrome", label: "Android" },
  { size: 512, type: "pwa", label: "App Store / PWA" },
] as const;

export type FaviconType = typeof FAVICON_SIZES[number]["type"];
