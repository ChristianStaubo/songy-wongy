"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Check, Zap, Star, Gift } from "lucide-react";
import { CreditPackage } from "../types/credits-types";

interface BuyCreditsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onPurchase: (packageId: string) => void;
  isLoading?: boolean;
}

// Credit packages with updated pricing
const CREDIT_PACKAGES: CreditPackage[] = [
  {
    id: "starter",
    name: "Starter Pack",
    credits: 5,
    price: 5.0,
    description: "Perfect for trying out Songy-Wongy",
    features: ["5 song generations", "Download MP3s", "Basic support"],
  },
  {
    id: "creator",
    name: "Creator Pack",
    credits: 10,
    price: 9.0, // $0.90 per credit
    popular: true,
    originalPrice: 10.0,
    description: "Great for regular music creation",
    features: [
      "10 song generations",
      "Download MP3s",
      "Priority support",
      "Early access to new features",
    ],
  },
  {
    id: "pro",
    name: "Pro Pack",
    credits: 25,
    price: 20.0, // $0.80 per credit
    originalPrice: 25.0,
    description: "Best value for serious creators",
    features: [
      "25 song generations",
      "Download MP3s",
      "Premium support",
      "Early access to new features",
      "Custom song lengths",
    ],
  },
];

export function BuyCreditsModal({
  open,
  onOpenChange,
  onPurchase,
  isLoading = false,
}: BuyCreditsModalProps) {
  const [selectedPackage, setSelectedPackage] = useState<string | null>(null);

  const handlePurchase = (packageId: string) => {
    setSelectedPackage(packageId);
    onPurchase(packageId);
  };

  const getPackageIcon = (packageId: string) => {
    switch (packageId) {
      case "starter":
        return <Gift className="h-6 w-6" />;
      case "creator":
        return <Zap className="h-6 w-6" />;
      case "pro":
        return <Star className="h-6 w-6" />;
      default:
        return <Zap className="h-6 w-6" />;
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold text-center">
            🎵 Buy Credits
          </DialogTitle>
          <DialogDescription className="text-center">
            Choose the perfect credit package for your music creation needs.
            <br />
            <span className="text-sm text-muted-foreground">
              1 credit = 1 minute of generated audio (rounded up)
            </span>
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-4">
          {CREDIT_PACKAGES.map((pkg) => (
            <div
              key={pkg.id}
              className={`relative rounded-lg border-2 p-6 cursor-pointer transition-all hover:shadow-md ${
                pkg.popular
                  ? "border-primary-500 bg-primary-50/50"
                  : "border-gray-200 hover:border-gray-300"
              }`}
            >
              {pkg.popular && (
                <Badge className="absolute -top-3 left-1/2 -translate-x-1/2 bg-primary hover:bg-primary-700">
                  Most Popular
                </Badge>
              )}

              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div
                    className={`p-2 rounded-full ${
                      pkg.popular
                        ? "bg-primary-100 text-primary-600"
                        : "bg-gray-100 text-gray-600"
                    }`}
                  >
                    {getPackageIcon(pkg.id)}
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold">{pkg.name}</h3>
                    <p className="text-sm text-muted-foreground">
                      {pkg.description}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <div className="flex items-center gap-2">
                    {pkg.originalPrice && (
                      <span className="text-sm text-muted-foreground line-through">
                        ${pkg.originalPrice.toFixed(2)}
                      </span>
                    )}
                    <span className="text-2xl font-bold">
                      ${pkg.price.toFixed(2)}
                    </span>
                  </div>
                  <div className="text-sm text-muted-foreground">
                    {pkg.credits} credits
                  </div>
                  <div className="text-xs text-muted-foreground">
                    ${(pkg.price / pkg.credits).toFixed(2)} per credit
                  </div>
                </div>
              </div>

              <div className="mb-4">
                <div className="flex flex-wrap gap-2">
                  {pkg.features?.map((feature, index) => (
                    <div
                      key={index}
                      className="flex items-center gap-1 text-sm text-muted-foreground"
                    >
                      <Check className="h-3 w-3 text-green-500" />
                      <span>{feature}</span>
                    </div>
                  ))}
                </div>
              </div>

              <Button
                onClick={() => handlePurchase(pkg.id)}
                disabled={isLoading}
                className={`w-full ${
                  pkg.popular
                    ? "bg-primary hover:bg-primary-700"
                    : "bg-gray-900 hover:bg-gray-800"
                }`}
                size="lg"
              >
                {isLoading && selectedPackage === pkg.id ? (
                  <div className="flex items-center gap-2">
                    <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                    Processing...
                  </div>
                ) : (
                  `Buy ${pkg.credits} Credits - $${pkg.price.toFixed(2)}`
                )}
              </Button>
            </div>
          ))}
        </div>

        <div className="text-center pt-4 border-t">
          <p className="text-xs text-muted-foreground">
            💳 Secure payment powered by Stripe
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            Credits never expire • Instant activation • 24/7 support
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}
