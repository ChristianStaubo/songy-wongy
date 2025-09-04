"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { BuyCreditsModal } from "./buy-credits-modal";

interface CreditsDisplayProps {
  credits: number;
  songsCount: number;
  onPurchaseCredits?: (packageId: string) => void;
  isLoading?: boolean;
}

export function CreditsDisplay({
  credits,
  songsCount,
  onPurchaseCredits,
  isLoading = false,
}: CreditsDisplayProps) {
  const [showBuyModal, setShowBuyModal] = useState(false);

  const handlePurchase = (packageId: string) => {
    if (onPurchaseCredits) {
      onPurchaseCredits(packageId);
    }
    // Keep modal open until purchase is complete or fails
    // The parent component should handle closing the modal
  };

  const getCreditStatusColor = () => {
    if (credits === 0) return "text-primary-600";
    if (credits <= 2) return "text-orange-600";
    return "text-green-600";
  };

  const getCreditStatusMessage = () => {
    if (credits === 0)
      return "No credits remaining - Buy more to continue creating!";
    if (credits <= 2) return "Running low on credits";
    return "You're all set to create amazing music!";
  };

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">💎 Credits</CardTitle>
          <CardDescription>
            Each song costs 1 credit per minute (rounded up)
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="text-center">
            <div className={`text-3xl font-bold ${getCreditStatusColor()}`}>
              {credits}
            </div>
            <div className="text-sm text-gray-600">credits remaining</div>
            <div className="text-xs text-muted-foreground mt-1">
              {getCreditStatusMessage()}
            </div>
          </div>

          <Button
            onClick={() => setShowBuyModal(true)}
            className="w-full bg-primary hover:bg-primary-700"
            size="lg"
            disabled={isLoading}
          >
            {isLoading ? (
              <div className="flex items-center gap-2">
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                Processing...
              </div>
            ) : (
              "Buy Credits"
            )}
          </Button>

          <div className="text-xs text-gray-500 text-center">
            Secure payment powered by Stripe
          </div>
        </CardContent>
      </Card>

      <BuyCreditsModal
        open={showBuyModal}
        onOpenChange={setShowBuyModal}
        onPurchase={handlePurchase}
        isLoading={isLoading}
      />
    </>
  );
}
