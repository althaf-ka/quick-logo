import { z } from "zod";

export const createCheckoutRequestSchema = z.object({
  tierName: z.enum(["Starter", "Pro"]),
  returnUrl: z.string().url(),
});

export type CreateCheckoutRequest = z.infer<typeof createCheckoutRequestSchema>;
