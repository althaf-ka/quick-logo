export const BRAND_KIT_FONTS = [
  { id: "modern-sans", name: "Modern Sans-Serif", family: "Inter, sans-serif" },
  { id: "classic-serif", name: "Classic Serif", family: "Merriweather, serif" },
  { id: "playful-display", name: "Playful Display", family: "Comic Sans MS, cursive" },
  { id: "elegant-script", name: "Elegant Script", family: "Brush Script MT, cursive" },
  { id: "tech-mono", name: "Tech Mono", family: "JetBrains Mono, monospace" },
] as const;

export type BrandKitFont = (typeof BRAND_KIT_FONTS)[number];

export function getFontById(id: string): BrandKitFont {
  return BRAND_KIT_FONTS.find((f) => f.id === id) ?? BRAND_KIT_FONTS[0];
}
