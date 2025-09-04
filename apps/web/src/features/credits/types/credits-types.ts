export interface CreditPackage {
  id: string;
  name: string;
  credits: number;
  price: number;
  originalPrice?: number; // For showing discounts
  popular?: boolean;
  description: string;
  features?: string[];
}

export interface UserCredits {
  balance: number;
  totalPurchased: number;
  totalUsed: number;
}

export interface PurchaseCreditsRequest {
  packageId: string;
  quantity?: number;
}

export interface PurchaseCreditsResponse {
  success: boolean;
  checkoutUrl?: string;
  sessionId?: string;
  error?: string;
}
