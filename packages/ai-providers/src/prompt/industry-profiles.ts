/**
 * Static industry profiles for logo prompt enrichment.
 * Maps industry keywords to visual associations that improve prompt quality.
 * No AI required — pure dictionary lookup. Zero runtime cost.
 *
 * Used by buildBasePrompt() so ALL models benefit (including those with
 * native prompt enhancement that skip the LLM rewrite path).
 */

export interface IndustryProfile {
  keywords: string[];
  /** Specific icon/symbol ideas for this industry */
  symbolSuggestions: string[];
  /** Visual cues and style direction */
  visualCues: string[];
  /** Colors commonly associated with this industry */
  colorSuggestions: string[];
  /** Visual approaches to avoid for this industry */
  avoid: string[];
}

export const INDUSTRY_PROFILES: Record<string, IndustryProfile> = {
  coffee: {
    keywords: ["cafe", "coffee", "espresso", "roaster", "barista"],
    symbolSuggestions: ["coffee bean", "steam", "cup", "leaf"],
    visualCues: ["artisan", "warm", "organic", "inviting"],
    colorSuggestions: ["espresso brown", "cream", "copper", "warm amber"],
    avoid: ["cold", "clinical", "neon"],
  },
  legal: {
    keywords: ["law", "legal", "attorney", "lawyer", "advocate"],
    symbolSuggestions: ["scales", "shield", "column", "gavel"],
    visualCues: ["trust", "authority", "minimal", "institutional"],
    colorSuggestions: ["navy", "gold", "charcoal", "silver"],
    avoid: ["playful", "casual", "bright neon", "cartoonish"],
  },
  construction: {
    keywords: ["construction", "building", "contractor", "engineering"],
    symbolSuggestions: ["hard hat", "crane", "beam", "foundation"],
    visualCues: ["strength", "industrial", "bold geometry", "solid"],
    colorSuggestions: ["orange", "steel grey", "black", "yellow"],
    avoid: ["delicate", "pastel", "ornate", "script fonts"],
  },
  tech: {
    keywords: ["tech", "software", "saas", "startup", "digital"],
    symbolSuggestions: ["circuit", "node", "hexagon", "data flow"],
    visualCues: ["innovation", "precision", "geometric", "clean"],
    colorSuggestions: ["gradient blue", "electric blue", "teal", "white"],
    avoid: ["vintage", "rustic", "hand-drawn", "ornate"],
  },
  food: {
    keywords: [
      "restaurant",
      "food",
      "bakery",
      "kitchen",
      "chef",
      "catering",
      "diner",
    ],
    symbolSuggestions: ["utensils", "flame", "wheat", "plate"],
    visualCues: ["appetite", "fresh", "homemade", "natural"],
    colorSuggestions: ["warm red", "golden amber", "cream", "green"],
    avoid: ["cold", "clinical", "industrial"],
  },
  fashion: {
    keywords: ["fashion", "clothing", "apparel", "boutique", "couture"],
    symbolSuggestions: ["monogram", "hanger", "needle", "thread"],
    visualCues: ["elegance", "editorial", "refined", "sophisticated"],
    colorSuggestions: ["black", "gold", "blush pink", "ivory"],
    avoid: ["heavy", "industrial", "cartoonish", "loud"],
  },
  fitness: {
    keywords: ["fitness", "gym", "sport", "athletic", "training", "workout"],
    symbolSuggestions: ["dumbbell", "lightning bolt", "flame", "mountain"],
    visualCues: ["energy", "dynamic", "bold", "angular", "motion"],
    colorSuggestions: ["red", "black", "electric blue", "orange"],
    avoid: ["delicate", "ornate", "script fonts", "pastel"],
  },
  healthcare: {
    keywords: ["health", "medical", "clinic", "dental", "pharmacy", "wellness"],
    symbolSuggestions: ["cross", "leaf", "heart", "pulse line"],
    visualCues: ["trust", "clean", "calming", "rounded"],
    colorSuggestions: ["teal", "soft blue", "white", "green"],
    avoid: ["aggressive", "dark", "angular", "industrial"],
  },
  finance: {
    keywords: ["finance", "bank", "invest", "insurance", "capital", "wealth"],
    symbolSuggestions: ["shield", "arrow", "column", "chart"],
    visualCues: ["stability", "trust", "institutional", "authoritative"],
    colorSuggestions: ["navy", "gold", "charcoal", "silver"],
    avoid: ["playful", "casual", "bright", "cartoonish"],
  },
  education: {
    keywords: [
      "education",
      "school",
      "academy",
      "university",
      "learning",
      "tutor",
    ],
    symbolSuggestions: ["book", "torch", "crest", "owl", "graduation cap"],
    visualCues: ["knowledge", "scholarly", "open", "growth"],
    colorSuggestions: ["navy", "burgundy", "gold", "forest green"],
    avoid: ["aggressive", "neon", "industrial"],
  },
  gaming: {
    keywords: ["game", "gaming", "esport", "stream", "arcade"],
    symbolSuggestions: ["dragon", "sword", "controller", "shield"],
    visualCues: ["energy", "bold", "angular", "dynamic"],
    colorSuggestions: ["crimson red", "electric blue", "neon orange", "black"],
    avoid: ["corporate", "serif", "traditional", "soft"],
  },
  creative: {
    keywords: ["design", "creative", "agency", "studio", "photography"],
    symbolSuggestions: ["brush stroke", "aperture", "palette", "pen nib"],
    visualCues: ["creativity", "abstract mark", "modern", "expressive"],
    colorSuggestions: ["spectrum", "gradient", "bold accent", "monochrome"],
    avoid: ["corporate", "rigid", "institutional"],
  },
  realestate: {
    keywords: [
      "real estate",
      "property",
      "realty",
      "broker",
      "homes",
      "housing",
    ],
    symbolSuggestions: ["house", "roof", "key", "building", "door"],
    visualCues: ["professional", "structural", "trust", "solid"],
    colorSuggestions: ["navy", "forest green", "burgundy", "charcoal"],
    avoid: ["playful", "chaotic", "hand-drawn"],
  },
  beauty: {
    keywords: ["beauty", "wellness", "spa", "salon", "cosmetics", "skincare"],
    symbolSuggestions: ["lotus", "face profile", "leaf", "sparkle", "flower"],
    visualCues: ["elegant", "soft", "organic", "calm"],
    colorSuggestions: ["blush pink", "soft gold", "sage green", "lavender"],
    avoid: ["aggressive", "industrial", "neon", "heavy"],
  },
  retail: {
    keywords: ["retail", "shop", "ecommerce", "store", "boutique", "market"],
    symbolSuggestions: ["shopping bag", "cart", "tag", "storefront"],
    visualCues: ["inviting", "approachable", "commercial", "clear"],
    colorSuggestions: ["coral", "bright blue", "emerald", "black"],
    avoid: ["complex", "gritty", "overly abstract"],
  },
  travel: {
    keywords: [
      "travel",
      "hospitality",
      "hotel",
      "resort",
      "vacation",
      "tourism",
    ],
    symbolSuggestions: [
      "globe",
      "airplane",
      "suitcase",
      "compass",
      "palm tree",
    ],
    visualCues: ["dynamic", "welcoming", "adventurous", "premium"],
    colorSuggestions: ["sky blue", "sunset orange", "sand", "turquoise"],
    avoid: ["rigid", "stuffy", "clinical"],
  },
  entertainment: {
    keywords: ["entertainment", "music", "media", "production", "dj", "band"],
    symbolSuggestions: ["music note", "play button", "star", "microphone"],
    visualCues: ["vibrant", "energetic", "loud", "expressive"],
    colorSuggestions: ["neon purple", "electric pink", "cyan", "black"],
    avoid: ["boring", "muted", "institutional", "traditional"],
  },
  pets: {
    keywords: ["pet", "animal", "vet", "dog", "cat", "grooming", "wildlife"],
    symbolSuggestions: ["paw print", "dog profile", "cat", "bone"],
    visualCues: ["friendly", "warm", "approachable", "playful"],
    colorSuggestions: ["orange", "warm yellow", "brown", "teal"],
    avoid: ["cold", "sharp", "clinical", "intimidating"],
  },
  agriculture: {
    keywords: ["agriculture", "nature", "farm", "garden", "landscape", "eco"],
    symbolSuggestions: ["leaf", "tree", "tractor", "sprout", "sun"],
    visualCues: ["organic", "earthy", "growing", "natural"],
    colorSuggestions: ["forest green", "earth brown", "sun yellow", "sky blue"],
    avoid: ["artificial", "neon", "industrial", "tech"],
  },
  consulting: {
    keywords: ["consulting", "business", "corporate", "b2b", "management"],
    symbolSuggestions: ["chart", "arrow", "globe", "handshake"],
    visualCues: ["professional", "trusted", "authoritative", "clean"],
    colorSuggestions: ["navy", "silver", "slate", "deep red"],
    avoid: ["casual", "cartoonish", "messy", "trendy"],
  },
  homeservices: {
    keywords: [
      "cleaning",
      "home services",
      "plumbing",
      "electrical",
      "hvac",
      "repair",
    ],
    symbolSuggestions: ["sparkle", "wrench", "house", "water drop"],
    visualCues: ["fresh", "reliable", "practical", "bold"],
    colorSuggestions: ["bright blue", "clean white", "vibrant green", "yellow"],
    avoid: ["dark", "grungy", "delicate", "abstract"],
  },
  events: {
    keywords: ["event", "wedding", "planner", "party", "celebration"],
    symbolSuggestions: ["ring", "calendar", "champagne", "ribbon"],
    visualCues: ["elegant", "script", "celebratory", "memorable"],
    colorSuggestions: ["gold", "champagne", "rose gold", "white"],
    avoid: ["heavy", "industrial", "tech", "blocky"],
  },
};

/**
 * Matches a user's prompt against industry profiles using word-boundary matching.
 * Scores by number of exact keyword hits. Returns the best match or null.
 */
export function matchIndustryProfile(prompt: string): IndustryProfile | null {
  // Truncate to prevent performance issues on massive copy-pastes
  const text = prompt.slice(0, 500);
  let bestMatch: IndustryProfile | null = null;
  let bestScore = 0;

  for (const [, profile] of Object.entries(INDUSTRY_PROFILES)) {
    let score = 0;
    for (const kw of profile.keywords) {
      // Use regex word boundaries to match exact phrases (e.g. "data flow" or "tech")
      // Escape any special regex chars in kw just in case, though they are alphanumeric
      const safeKw = kw.replace(/[-/\\^$*+?.()|[\]{}]/g, "\\$&");
      const regex = new RegExp(`\\b${safeKw}\\b`, "i");
      if (regex.test(text)) {
        score++;
      }
    }

    if (score > bestScore) {
      bestScore = score;
      bestMatch = profile;
    }
  }

  return bestMatch;
}
