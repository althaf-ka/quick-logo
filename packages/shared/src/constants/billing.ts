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
