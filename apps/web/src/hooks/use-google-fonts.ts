import { useQuery } from "@tanstack/react-query";

const GOOGLE_FONTS_API_URL = "https://www.googleapis.com/webfonts/v1/webfonts";

export interface GoogleFontItem {
  family: string;
  category: string;
  variants: string[];
}

interface GoogleFontsResponse {
  items?: GoogleFontItem[];
}

const MATERIAL_ICON_REGEX = /^material (icons|symbols)/i;

/**
 * Fetches the full Google Fonts catalog from the Developer API.
 * Optimized to filter out mislabeled icon fonts in a single processing pass.
 */
export function useGoogleFonts(apiKey: string) {
  const hasApiKey = apiKey.trim().length > 0;

  return useQuery({
    queryKey: ["google-fonts", apiKey],
    queryFn: async (): Promise<GoogleFontItem[]> => {
      const url = new URL(GOOGLE_FONTS_API_URL);
      url.searchParams.set("sort", "popularity");
      url.searchParams.set("key", apiKey);

      const res = await fetch(url.toString());
      if (!res.ok) throw new Error("Failed to fetch Google Fonts");

      const data = (await res.json()) as GoogleFontsResponse;
      const items = data.items ?? [];

      // Process items in a single pass for maximum performance (O(n))
      return items.reduce<GoogleFontItem[]>((acc, font) => {
        const isIcon =
          font.category === "icons" || MATERIAL_ICON_REGEX.test(font.family);

        if (!isIcon) {
          acc.push({
            family: font.family,
            category: font.category,
            variants: font.variants,
          });
        }
        return acc;
      }, []);
    },
    enabled: hasApiKey,
    staleTime: 24 * 60 * 60 * 1000,
    gcTime: 7 * 24 * 60 * 60 * 1000,
    refetchOnMount: false,
    refetchOnWindowFocus: false,
  });
}
