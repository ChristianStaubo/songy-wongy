"use client";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

interface CreditsSectionProps {
  credits: number;
  songsCount: number;
  onPurchaseCredits: () => void;
}

export function CreditsSection({
  credits,
  songsCount,
  onPurchaseCredits,
}: CreditsSectionProps) {
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">💎 Credits</CardTitle>
          <CardDescription>
            Each song costs 1 credit to generate
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="text-center">
            <div className="text-3xl font-bold text-red-600">{credits}</div>
            <div className="text-sm text-gray-600">credits remaining</div>
          </div>

          <Button
            onClick={onPurchaseCredits}
            className="w-full bg-red-600 hover:bg-red-700"
            size="lg"
          >
            Buy 10 Credits - $9.99
          </Button>

          <div className="text-xs text-gray-500 text-center">
            Secure payment powered by Stripe
          </div>
        </CardContent>
      </Card>

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
