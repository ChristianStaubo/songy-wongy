import { z } from "zod";

export const purchaseCreditsSchema = z.object({
  packageId: z.string().min(1, "Package ID is required"),
  quantity: z.number().min(1, "Quantity must be at least 1").optional(),
});

export type PurchaseCreditsInput = z.infer<typeof purchaseCreditsSchema>;
