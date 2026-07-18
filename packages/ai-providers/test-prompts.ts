import {
  normalizeBrandContext,
  buildBusinessCardGenerationParams,
} from "./src/prompt";
import { DEFAULT_BUSINESS_CARD_BRIEF } from "@quicklogo/shared";

// Test 1: URL mapping
const ctx1 = normalizeBrandContext("Brand1", {
  socials: {
    instagram: "https://instagram.com/mybrand",
    tiktok: "@mybrand",
    linkedin: "linkedin.com/company/mybrand",
    youtube: "youtube.com/@channel1",
  },
});
console.assert(
  ctx1.socials.instagram === "@mybrand",
  `IG failed: ${ctx1.socials.instagram}`,
);
console.assert(
  ctx1.socials.tiktok === "@mybrand",
  `TikTok failed: ${ctx1.socials.tiktok}`,
);
console.assert(
  ctx1.socials.linkedin === "linkedin.com/company/mybrand",
  `LinkedIn failed: ${ctx1.socials.linkedin}`,
);
console.assert(
  ctx1.socials.youtube === "youtube.com/@channel1",
  `YouTube failed: ${ctx1.socials.youtube}`,
);

// Test 2: Website cleans protocol and www
const ctx2 = normalizeBrandContext("Brand2", {
  contact: { website: "https://www.example.com", name: "  " },
});
console.assert(
  ctx2.contact.website === "example.com",
  `Website failed: ${ctx2.contact.website}`,
);
console.assert(
  ctx2.contact.name === undefined,
  `Empty name failed: ${ctx2.contact.name}`,
);

// Test 3: Tagline only business card front includes tagline
const ctx3 = normalizeBrandContext("Brand3", { tagline: "A great brand" });
const prompt3Front = buildBusinessCardGenerationParams({
  variation: "front",
  brandName: "Brand3",
  sourceLogoUrl: "",
  backendModel: "",
  context: ctx3,
}).prompt;
console.assert(
  prompt3Front.includes('Include tagline: "A great brand"'),
  `Tagline failed: ${prompt3Front}`,
);

// Test 4: Contact-only front does not include contact details
const ctx4 = normalizeBrandContext("Brand4", { contact: { email: "a@b.com" } });
const prompt4Front = buildBusinessCardGenerationParams({
  variation: "front",
  brandName: "Brand4",
  sourceLogoUrl: "",
  backendModel: "",
  context: ctx4,
}).prompt;
console.assert(
  !prompt4Front.includes("Email"),
  `Contact-only front failed: ${prompt4Front}`,
);
const prompt4Back = buildBusinessCardGenerationParams({
  variation: "back",
  brandName: "Brand4",
  sourceLogoUrl: "",
  backendModel: "",
  context: ctx4,
}).prompt;
console.assert(
  prompt4Back.includes("Email: a@b.com"),
  `Contact-only back failed: ${prompt4Back}`,
);

// Test 5: Matching social usernames are merged on the card back
const ctx5 = normalizeBrandContext("Brand5", {
  industry: "Creator",
  socials: { instagram: "same-handle", tiktok: "@same-handle" },
  contact: { email: "a@b.com" },
});
const prompt5Back = buildBusinessCardGenerationParams({
  variation: "back",
  brandName: "Brand5",
  sourceLogoUrl: "",
  backendModel: "",
  context: ctx5,
  businessCardBrief: {
    ...DEFAULT_BUSINESS_CARD_BRIEF,
    includedContactFields: ["email"],
    includedSocialPlatforms: ["instagram", "tiktok"],
  },
}).prompt;
console.assert(
  prompt5Back.includes("Instagram + TikTok icons") &&
    prompt5Back.includes('username "same-handle" exactly once'),
  `Social grouping failed: ${prompt5Back}`,
);

// Test 6: QR-enabled cards reserve an empty zone for deterministic overlay
const prompt6Back = buildBusinessCardGenerationParams({
  variation: "back",
  brandName: "Brand6",
  sourceLogoUrl: "logo.png",
  backendModel: "",
  context: normalizeBrandContext("Brand6", {
    contact: { website: "example.com" },
  }),
  businessCardBrief: {
    ...DEFAULT_BUSINESS_CARD_BRIEF,
    includedContactFields: ["website"],
    includeQr: true,
  },
}).prompt;
console.assert(
  prompt6Back.includes("Do not draw a QR code") &&
    prompt6Back.includes("overlaid afterward"),
  `QR safe-zone failed: ${prompt6Back}`,
);

console.log("All tests passed!");
