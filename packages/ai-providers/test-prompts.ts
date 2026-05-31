import { normalizeBrandContext, buildBusinessCardGenerationParams } from "./src/prompt";

// Test 1: URL mapping
const ctx1 = normalizeBrandContext("Brand1", {
  socials: {
    instagram: "https://instagram.com/mybrand",
    tiktok: "@mybrand",
    linkedin: "linkedin.com/company/mybrand",
    youtube: "youtube.com/@channel1",
  }
});
console.assert(ctx1.socials.instagram === "@mybrand", `IG failed: ${ctx1.socials.instagram}`);
console.assert(ctx1.socials.tiktok === "@mybrand", `TikTok failed: ${ctx1.socials.tiktok}`);
console.assert(ctx1.socials.linkedin === "linkedin.com/company/mybrand", `LinkedIn failed: ${ctx1.socials.linkedin}`);
console.assert(ctx1.socials.youtube === "youtube.com/@channel1", `YouTube failed: ${ctx1.socials.youtube}`);

// Test 2: Website cleans protocol and www
const ctx2 = normalizeBrandContext("Brand2", {
  contact: { website: "https://www.example.com", name: "  " }
});
console.assert(ctx2.contact.website === "example.com", `Website failed: ${ctx2.contact.website}`);
console.assert(ctx2.contact.name === undefined, `Empty name failed: ${ctx2.contact.name}`);

// Test 3: Tagline only business card front includes tagline
const ctx3 = normalizeBrandContext("Brand3", { tagline: "A great brand" });
const prompt3Front = buildBusinessCardGenerationParams({ variation: "front", brandName: "Brand3", sourceLogoUrl: "", backendModel: "", context: ctx3 }).prompt;
console.assert(prompt3Front.includes('Include tagline: "A great brand"'), `Tagline failed: ${prompt3Front}`);

// Test 4: Contact-only front does not include contact details
const ctx4 = normalizeBrandContext("Brand4", { contact: { email: "a@b.com" } });
const prompt4Front = buildBusinessCardGenerationParams({ variation: "front", brandName: "Brand4", sourceLogoUrl: "", backendModel: "", context: ctx4 }).prompt;
console.assert(!prompt4Front.includes("Email"), `Contact-only front failed: ${prompt4Front}`);
const prompt4Back = buildBusinessCardGenerationParams({ variation: "back", brandName: "Brand4", sourceLogoUrl: "", backendModel: "", context: ctx4 }).prompt;
console.assert(prompt4Back.includes("Email: a@b.com"), `Contact-only back failed: ${prompt4Back}`);

// Test 5: Both socials/contact includes one primary front detail and remaining back details
const ctx5 = normalizeBrandContext("Brand5", { industry: "Creator", socials: { instagram: "ig" }, contact: { email: "a@b.com" } });
const prompt5Front = buildBusinessCardGenerationParams({ variation: "front", brandName: "Brand5", sourceLogoUrl: "", backendModel: "", context: ctx5 }).prompt;
console.assert(prompt5Front.includes("Feature one primary detail only: Instagram: @ig"), `Front primary detail failed: ${prompt5Front}`);
const prompt5Back = buildBusinessCardGenerationParams({ variation: "back", brandName: "Brand5", sourceLogoUrl: "", backendModel: "", context: ctx5 }).prompt;
console.assert(prompt5Back.includes("Email: a@b.com") && !prompt5Back.includes("Instagram"), `Back detail failed: ${prompt5Back}`);

console.log("All tests passed!");
