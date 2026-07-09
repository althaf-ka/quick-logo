export interface PricingTier {
  name: string;
  description: string;
  price: string;
  priceAmount: number;
  currency: string;
  credits: number;
  features: string[];
  popular: boolean;
  productId?: string; // Add productId to the interface
}

// ── Brand kit credit pricing ──
// Single source of truth shared by the API charge path (apps/api brand-kits route)
// and the worker refund path (apps/worker brand-kit pipeline). Keep them in sync by
// only ever computing cost/refunds from these constants.

export const BRAND_KIT_BASE_COST = 5;

export type BrandKitPaidSection =
  | "logoVariations"
  | "socialMedia"
  | "businessCard"
  | "favicon"
  | "brandPresentation"
  | "brandGraphics"
  | "brandGuidelines";

/**
 * Per-section credit cost. Sections not listed here are free.
 * A section costing 0 automatically refunds 0, so free sections never over-refund.
 */
export const BRAND_KIT_SECTION_COSTS: Record<BrandKitPaidSection, number> = {
  logoVariations: 2,
  socialMedia: 3,
  businessCard: 2,
  favicon: 1,
  brandPresentation: 3,
  brandGraphics: 2,
  brandGuidelines: 0,
};

/** Total credits charged for a brand kit given its selected deliverables. */
export function computeBrandKitCost(
  deliverables: Partial<Record<BrandKitPaidSection, boolean>>,
): number {
  let cost = BRAND_KIT_BASE_COST;
  for (const key of Object.keys(
    BRAND_KIT_SECTION_COSTS,
  ) as BrandKitPaidSection[]) {
    if (deliverables[key]) cost += BRAND_KIT_SECTION_COSTS[key];
  }
  return cost;
}

/**
 * Credits to refund for one section, prorated by how many of its assets failed.
 * Integer-safe and never exceeds the section's charged cost. Free sections → 0.
 */
export function computeSectionRefund(
  cost: number,
  failed: number,
  total: number,
): number {
  if (cost <= 0 || failed <= 0 || total <= 0) return 0;
  return Math.min(cost, Math.round((cost * failed) / total));
}

export const PRICING_TIERS: PricingTier[] = [
  {
    name: "Starter",
    description: "Perfect for a few quick logo concepts",
    price: "₹99",
    priceAmount: 99,
    currency: "INR",
    credits: 50,
    popular: false,
    productId: "pdt_0Na2NG3rlssvcUzv1OK7V",
    features: [
      "50 Standard Generations",
      "Basic Vector Exports",
      "Standard Support",
    ],
  },
  {
    name: "Pro",
    description: "Best for professional designers",
    price: "₹199",
    priceAmount: 199,
    currency: "INR",
    credits: 150,
    popular: true,
    productId: "pdt_0Na2NRWvzIV7SeJEDtorz",
    features: [
      "150 Priority Generations",
      "Full Commercial Rights",
      "Priority Support",
    ],
  },
];
