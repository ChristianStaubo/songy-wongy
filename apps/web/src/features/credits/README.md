# Credits Feature

This feature implements the credit-based system for Songy-Wongy as specified in the PRD.

## Components

### CreditsDisplay

Main component that shows current credit balance and provides a "Buy Credits" button that opens the purchase modal.

**Props:**

- `credits: number` - Current credit balance
- `songsCount: number` - Number of songs created (for stats)
- `onPurchaseCredits?: (packageId: string) => void` - Callback when user initiates purchase
- `isLoading?: boolean` - Loading state during purchase

### BuyCreditsModal

Modal dialog that displays available credit packages based on PRD pricing.

**Props:**

- `open: boolean` - Modal visibility
- `onOpenChange: (open: boolean) => void` - Modal state handler
- `onPurchase: (packageId: string) => void` - Purchase callback
- `isLoading?: boolean` - Loading state

## Credit Packages (Updated Pricing)

1. **Starter Pack** - 5 credits for $5.00 ($1.00 per credit)
2. **Creator Pack** - 10 credits for $9.00 ($0.90 per credit) - Most Popular
3. **Pro Pack** - 25 credits for $20.00 ($0.80 per credit) - Best Value

## Pricing Logic

- 1 credit = 1 minute of generated audio (rounded up)
- Tiered pricing with better value for larger packages
- Starter: $1.00/credit, Creator: $0.90/credit, Pro: $0.80/credit
- All packages provide sustainable margin over ElevenLabs API cost ($0.50/min)

## Usage

```tsx
import { CreditsDisplay } from "@/features/credits";

function Dashboard() {
  const handlePurchaseCredits = async (packageId: string) => {
    // Implement Stripe checkout integration
    const response = await fetch("/api/credits/purchase", {
      method: "POST",
      body: JSON.stringify({ packageId }),
    });

    const { checkoutUrl } = await response.json();
    window.location.href = checkoutUrl;
  };

  return (
    <CreditsDisplay
      credits={userCredits}
      songsCount={userSongs.length}
      onPurchaseCredits={handlePurchaseCredits}
    />
  );
}
```

## Next Steps

1. Implement backend API endpoints for Stripe integration
2. Add webhook handling for successful payments
3. Update user credit balance in database
4. Add credit usage tracking when songs are generated
