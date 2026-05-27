export interface StructuredBrandContext {
  industry?: string;
  tagline?: string;
  targetAudience?: string;
  selectedVibes?: string[];
  brandPersonality?: string;
  additionalContext?: string;
  socials?: Record<string, string>;
  contact?: Record<string, string>;
  guidelines?: { depth?: "essential" | "complete" };
  _hydratedAt?: number;
}

export function buildBrandContextSummary(
  context: StructuredBrandContext,
  fallbackPrompt?: string,
): string {
  const parts: string[] = [];

  if (context.tagline) parts.push(`Tagline: ${context.tagline}`);
  if (context.industry) parts.push(`Industry: ${context.industry}`);
  if (context.targetAudience)
    parts.push(`Target Audience: ${context.targetAudience}`);
  if (context.selectedVibes && context.selectedVibes.length > 0)
    parts.push(`Brand Vibe: ${context.selectedVibes.join(", ")}`);
  if (context.brandPersonality?.trim()) {
    parts.push(`Brand Personality:\n${context.brandPersonality.trim()}`);
  }
  if (context.additionalContext?.trim()) {
    parts.push(`Additional Instructions:\n${context.additionalContext.trim()}`);
  }

  // If there's literally nothing, return fallback
  if (parts.length === 0) {
    return fallbackPrompt || "";
  }

  return parts.join("\n");
}
