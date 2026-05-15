import type { Database } from "@quicklogo/db";
import { brandKits, brandKitRevisions, eq, ne, and, desc } from "@quicklogo/db";

interface LogoVariationResult {
  id: string;
  url: string;
}

export function extractReusableLogoVariationUrls(
  results: unknown,
  sourceLogoUrl: string,
): { darkModeUrl: string; iconOnlyUrl: string } | null {
  if (typeof results !== "object" || results === null) return null;

  const logoVariations = (results as { logoVariations?: unknown })
    .logoVariations;
  if (!Array.isArray(logoVariations)) return null;

  const getUrl = (id: string) => {
    const match = logoVariations.find(
      (variation): variation is LogoVariationResult =>
        typeof variation === "object" &&
        variation !== null &&
        "id" in variation &&
        "url" in variation &&
        (variation as LogoVariationResult).id === id &&
        typeof (variation as LogoVariationResult).url === "string",
    );

    return match?.url;
  };

  const primaryUrl = getUrl("primary");
  const darkModeUrl = getUrl("dark");
  const iconOnlyUrl = getUrl("icon");

  if (primaryUrl !== sourceLogoUrl || !darkModeUrl || !iconOnlyUrl) {
    return null;
  }

  return { darkModeUrl, iconOnlyUrl };
}

export async function findReusableLogoVariationUrls({
  db,
  brandKitId,
  sourceLogoUrl,
}: {
  db: Database;
  brandKitId: string;
  sourceLogoUrl: string;
}): Promise<{ darkModeUrl: string; iconOnlyUrl: string } | null> {
  const currentBrandKit = await db.query.brandKits.findFirst({
    where: eq(brandKits.id, brandKitId),
  });
  if (!currentBrandKit) return null;

  const candidates = await db
    .select({ results: brandKitRevisions.results })
    .from(brandKitRevisions)
    .innerJoin(brandKits, eq(brandKitRevisions.brandKitId, brandKits.id))
    .where(
      and(
        eq(brandKits.userId, currentBrandKit.userId),
        ne(brandKits.id, brandKitId),
        eq(brandKits.status, "completed"),
        eq(brandKitRevisions.isActive, true),
      ),
    )
    .orderBy(desc(brandKitRevisions.createdAt))
    .limit(25);

  for (const candidate of candidates) {
    const reusableUrls = extractReusableLogoVariationUrls(
      candidate.results,
      sourceLogoUrl,
    );
    if (reusableUrls) return reusableUrls;
  }

  return null;
}
