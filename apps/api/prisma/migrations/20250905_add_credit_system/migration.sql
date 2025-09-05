-- Add new enums
CREATE TYPE "public"."AIProvider" AS ENUM ('ELEVENLABS', 'SELFHOSTED');
CREATE TYPE "public"."TransactionType" AS ENUM ('PURCHASE', 'DEDUCTION', 'REFUND', 'TRIAL');
CREATE TYPE "public"."TransactionStatus" AS ENUM ('PENDING', 'COMPLETED', 'FAILED', 'CANCELLED');

-- Update User table with credit system fields
ALTER TABLE "public"."User" ADD COLUMN "creditBalance" DECIMAL(10,4) NOT NULL DEFAULT 0;
ALTER TABLE "public"."User" ADD COLUMN "freeTrialUsedAt" TIMESTAMP(3);
ALTER TABLE "public"."User" ADD COLUMN "deletedAt" TIMESTAMP(3);

-- Create Transaction table
CREATE TABLE "public"."Transaction" (
    "id" TEXT NOT NULL,
    "type" "public"."TransactionType" NOT NULL,
    "amount" DECIMAL(10,4) NOT NULL,
    "description" TEXT NOT NULL,
    "status" "public"."TransactionStatus" NOT NULL DEFAULT 'PENDING',
    "userId" TEXT NOT NULL,
    "productId" TEXT,
    "stripePaymentIntentId" TEXT,
    "stripeWebhookId" TEXT,
    "amountPaidCents" INTEGER,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Transaction_pkey" PRIMARY KEY ("id")
);

-- Create Product table  
CREATE TABLE "public"."Product" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "credits" DECIMAL(10,4) NOT NULL,
    "priceUsd" INTEGER NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "stripePriceId" TEXT,
    "stripeProductId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Product_pkey" PRIMARY KEY ("id")
);

-- Create PricingTier table
CREATE TABLE "public"."PricingTier" (
    "id" TEXT NOT NULL,
    "provider" "public"."AIProvider" NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "creditsPerMinute" DECIMAL(10,4) NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PricingTier_pkey" PRIMARY KEY ("id")
);

-- Update Music table structure
-- First, make audioUrl nullable (for songs still generating)
ALTER TABLE "public"."Music" ALTER COLUMN "audioUrl" DROP NOT NULL;
ALTER TABLE "public"."Music" ALTER COLUMN "lengthMs" DROP NOT NULL;

-- Add new columns to Music table
ALTER TABLE "public"."Music" ADD COLUMN "thumbnailUrl" TEXT;
ALTER TABLE "public"."Music" ADD COLUMN "creditsUsed" DECIMAL(10,4) NOT NULL DEFAULT 0;
ALTER TABLE "public"."Music" ADD COLUMN "provider" "public"."AIProvider" NOT NULL DEFAULT 'ELEVENLABS';
ALTER TABLE "public"."Music" ADD COLUMN "transactionId" TEXT;
ALTER TABLE "public"."Music" ADD COLUMN "metadata" JSONB;

-- Handle existing Music records: Mark them as free (0 credits used)
-- This preserves user data and shows historical free generation
UPDATE "public"."Music" 
SET "creditsUsed" = 0, "provider" = 'ELEVENLABS'
WHERE "creditsUsed" IS NULL OR "creditsUsed" = 0;

-- Create indexes for User table
CREATE INDEX "User_deletedAt_idx" ON "public"."User"("deletedAt");
CREATE INDEX "User_freeTrialUsedAt_idx" ON "public"."User"("freeTrialUsedAt");

-- Create indexes for Transaction table
CREATE INDEX "Transaction_userId_idx" ON "public"."Transaction"("userId");
CREATE INDEX "Transaction_type_idx" ON "public"."Transaction"("type");
CREATE INDEX "Transaction_status_idx" ON "public"."Transaction"("status");
CREATE INDEX "Transaction_createdAt_idx" ON "public"."Transaction"("createdAt");
CREATE INDEX "Transaction_stripePaymentIntentId_idx" ON "public"."Transaction"("stripePaymentIntentId");
CREATE INDEX "Transaction_stripeWebhookId_idx" ON "public"."Transaction"("stripeWebhookId");

-- Create indexes for Product table
CREATE INDEX "Product_isActive_idx" ON "public"."Product"("isActive");
CREATE INDEX "Product_sortOrder_idx" ON "public"."Product"("sortOrder");

-- Create indexes for PricingTier table
CREATE INDEX "PricingTier_provider_idx" ON "public"."PricingTier"("provider");
CREATE INDEX "PricingTier_isActive_idx" ON "public"."PricingTier"("isActive");
CREATE INDEX "PricingTier_isDefault_idx" ON "public"."PricingTier"("isDefault");

-- Create additional index for Music table
CREATE INDEX "Music_status_idx" ON "public"."Music"("status");

-- Create unique constraints
CREATE UNIQUE INDEX "Transaction_stripePaymentIntentId_key" ON "public"."Transaction"("stripePaymentIntentId");
CREATE UNIQUE INDEX "Transaction_stripeWebhookId_key" ON "public"."Transaction"("stripeWebhookId");
CREATE UNIQUE INDEX "Product_stripePriceId_key" ON "public"."Product"("stripePriceId");
CREATE UNIQUE INDEX "Product_stripeProductId_key" ON "public"."Product"("stripeProductId");
CREATE UNIQUE INDEX "Music_transactionId_key" ON "public"."Music"("transactionId");
CREATE UNIQUE INDEX "PricingTier_provider_isDefault_key" ON "public"."PricingTier"("provider", "isDefault");

-- Add foreign key constraints
ALTER TABLE "public"."Transaction" ADD CONSTRAINT "Transaction_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "public"."Transaction" ADD CONSTRAINT "Transaction_productId_fkey" FOREIGN KEY ("productId") REFERENCES "public"."Product"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "public"."Music" ADD CONSTRAINT "Music_transactionId_fkey" FOREIGN KEY ("transactionId") REFERENCES "public"."Transaction"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Insert default pricing tier for ElevenLabs
INSERT INTO "public"."PricingTier" ("id", "provider", "name", "description", "creditsPerMinute", "isActive", "isDefault", "createdAt", "updatedAt")
VALUES ('elevenlabs-default', 'ELEVENLABS', 'Standard Generation', 'ElevenLabs API - Fast, high quality', 1.0, true, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);

-- Insert default credit packages
INSERT INTO "public"."Product" ("id", "name", "description", "credits", "priceUsd", "isActive", "sortOrder", "createdAt", "updatedAt")
VALUES 
  ('starter-pack', 'Starter Pack', '5 credits to get you started', 5.0, 500, true, 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('creator-pack', 'Creator Pack', '10 credits for regular creators', 10.0, 1000, true, 2, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('pro-pack', 'Pro Pack', '25 credits for power users', 25.0, 2500, true, 3, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);
