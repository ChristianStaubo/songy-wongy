/*
  Warnings:

  - You are about to drop the `Post` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "public"."Post" DROP CONSTRAINT "Post_authorId_fkey";

-- DropIndex
DROP INDEX "public"."Transaction_stripePaymentIntentId_key";

-- DropIndex
DROP INDEX "public"."Transaction_stripeWebhookId_key";

-- AlterTable
ALTER TABLE "public"."Music" ALTER COLUMN "creditsUsed" DROP DEFAULT;

-- DropTable
DROP TABLE "public"."Post";
