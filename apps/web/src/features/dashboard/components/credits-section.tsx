"use client";

import { useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { CreditsDisplay } from "@/features/credits";
import { toast } from "sonner";

interface CreditsSectionProps {
  credits: number;
  songsCount: number;
}

export function CreditsSection({ credits, songsCount }: CreditsSectionProps) {
  const [isLoading, setIsLoading] = useState(false);

  const handlePurchaseCredits = async (packageId: string) => {
    setIsLoading(true);
    try {
      // TODO: Implement Stripe checkout integration
      console.log("Purchasing credits for package:", packageId);

      // Simulate API call for now
      await new Promise((resolve) => setTimeout(resolve, 2000));

      toast.success("Redirecting to Stripe checkout...");

      // TODO: Redirect to Stripe checkout URL
      // window.location.href = checkoutUrl;
    } catch (error) {
      console.error("Purchase failed:", error);
      toast.error("Failed to initiate purchase. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <CreditsDisplay
        credits={credits}
        songsCount={songsCount}
        onPurchaseCredits={handlePurchaseCredits}
        isLoading={isLoading}
      />

      {/* Quick Stats */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">📊 Your Stats</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex justify-between">
            <span className="text-gray-600">Songs Created</span>
            <span className="font-semibold">{songsCount}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-600">Credits Used</span>
            <span className="font-semibold">{songsCount}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-600">Member Since</span>
            <span className="font-semibold">Jan 2024</span>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
