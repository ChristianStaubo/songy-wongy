"use client";

import { useState } from "react";
import { toast } from "sonner";
import {
  PurchaseCreditsRequest,
  PurchaseCreditsResponse,
} from "../types/credits-types";

export function usePurchaseCredits() {
  const [isLoading, setIsLoading] = useState(false);

  const purchaseCredits = async (
    packageId: string,
  ): Promise<PurchaseCreditsResponse> => {
    setIsLoading(true);

    try {
      // TODO: Replace with actual API call to your backend
      const response = await fetch("/api/credits/purchase", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ packageId } as PurchaseCreditsRequest),
      });

      if (!response.ok) {
        throw new Error("Failed to initiate purchase");
      }

      const result: PurchaseCreditsResponse = await response.json();

      if (result.success && result.checkoutUrl) {
        // Redirect to Stripe checkout
        window.location.href = result.checkoutUrl;
        return result;
      } else {
        throw new Error(result.error || "Purchase failed");
      }
    } catch (error) {
      console.error("Purchase error:", error);
      toast.error("Failed to initiate purchase. Please try again.");
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  return {
    purchaseCredits,
    isLoading,
  };
}
