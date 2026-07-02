export interface PromptExample {
  input: string;
  output: string;
}

/**
 * Few-shot examples for logo generation prompt rewriting.
 * Covers diverse industries to teach the LLM the output format and quality bar.
 * The LLM generalises the pattern across ANY domain — examples teach structure, not content.
 */
export const GENERATE_EXAMPLES: PromptExample[] = [
  {
    input: "tech startup, minimal",
    output:
      "A geometric hexagon formed by three overlapping translucent planes in gradient blue tones, creating depth through transparency. Clean sans-serif company name centered below in medium weight. Flat vector style with precise mathematical geometry. Cool blue palette transitioning from navy to electric blue. Vector logo, scalable, single icon, centered composition, professional branding, no background clutter.",
  },
  {
    input: "bakery, warm and friendly",
    output:
      "A stylized wheat stalk curving into a gentle spiral, forming a circular mark with soft rounded edges. Warm hand-lettered script brand name nestled below the icon. Artisan illustration style with subtle grain texture. Warm golden amber with cream accents and a touch of terracotta. Vector logo, scalable, single icon, centered composition, professional branding, no background clutter.",
  },
  {
    input: "lion, powerful, corporate",
    output:
      "A bold geometric lion head in profile, constructed from sharp angular facets creating a modern crystalline effect. Strong uppercase sans-serif brand name to the right in heavy weight. Corporate minimal style with precise geometric construction. Deep charcoal black with a single gold accent on the mane. Vector logo, scalable, single icon, centered composition, professional branding, no background clutter.",
  },
  {
    input: "coffee shop, artisan",
    output:
      "A hand-drawn coffee bean splitting open with delicate steam wisps rising into a loose circular frame. Warm serif brand name arching gently above the bean. Rustic artisan style with organic hand-illustrated linework. Rich espresso brown with cream and muted copper accents. Vector logo, scalable, single icon, centered composition, professional branding, no background clutter.",
  },
  {
    input: "fashion brand, luxury",
    output:
      "An elegant monogram formed from intertwined serif initials enclosed in a thin circular border with subtle Art Deco geometric accents. Brand name spelled out below in refined light-weight serif tracking. High fashion editorial style with restrained sophistication. Black and gold on clean white. Vector logo, scalable, single icon, centered composition, professional branding, no background clutter.",
  },
  {
    input: "finance, trustworthy",
    output:
      "A solid geometric shield with clean beveled edges containing a subtle upward-pointing arrow integrated into the negative space. Bold uppercase sans-serif brand name below in heavy weight. Corporate institutional style with authoritative symmetry. Deep navy blue with silver metallic accents. Vector logo, scalable, single icon, centered composition, professional branding, no background clutter.",
  },
  {
    input: "healthcare, caring",
    output:
      "A continuous flowing line forming both a heart and a leaf shape in a single graceful stroke, conveying life and wellness. Rounded sans-serif brand name below in medium weight with generous letter spacing. Soft modern style with smooth organic curves. Calming teal green with soft white. Vector logo, scalable, single icon, centered composition, professional branding, no background clutter.",
  },
  {
    input: "gaming, bold",
    output:
      "An angular stylized dragon head built from sharp interlocking geometric shards with aggressive forward-leaning posture. Bold italic sans-serif brand name slashed diagonally beneath. Esports style with dynamic angular energy and hard edges. Electric crimson red with deep black and subtle neon orange accents. Vector logo, scalable, single icon, centered composition, professional branding, no background clutter.",
  },
];

/**
 * Few-shot examples for edit/refinement prompt rewriting.
 */
export const EDIT_EXAMPLES: PromptExample[] = [
  {
    input: "make the background dark blue",
    output:
      "The existing logo icon and text preserved exactly as-is, now placed on a deep navy blue solid background. All original shapes, colors, and typography of the logo mark remain untouched. Professional logo, vector-style, sharp edges, clean design.",
  },
  {
    input: "add the text FLAVOR underneath",
    output:
      'The existing logo icon preserved exactly as-is with the text "FLAVOR" added below in clean bold sans-serif uppercase lettering, well-spaced and proportional to the icon above. Professional logo, vector-style, sharp edges, clean design.',
  },
  {
    input: "make it more modern and minimal",
    output:
      "The existing logo subject simplified into cleaner geometric forms with reduced detail, thinner strokes, and more negative space. Typography refined to a lighter-weight modern sans-serif. Color palette streamlined to fewer, bolder tones. Professional logo, vector-style, sharp edges, clean design.",
  },
];

/**
 * Formats an array of examples into a string for injection into the LLM system prompt.
 */
export function formatExamples(examples: PromptExample[]): string {
  return examples
    .map((ex) => `Input: "${ex.input}"\nOutput: ${ex.output}`)
    .join("\n\n");
}
