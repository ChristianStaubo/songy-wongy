-- CreateEnum
CREATE TYPE "public"."MusicStatus" AS ENUM ('GENERATING', 'COMPLETED', 'FAILED');

-- CreateTable
CREATE TABLE "public"."Music" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "prompt" TEXT NOT NULL,
    "audioUrl" TEXT NOT NULL,
    "lengthMs" INTEGER NOT NULL,
    "status" "public"."MusicStatus" NOT NULL DEFAULT 'GENERATING',
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Music_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Music_userId_idx" ON "public"."Music"("userId");

-- CreateIndex
CREATE INDEX "Music_createdAt_idx" ON "public"."Music"("createdAt");

-- AddForeignKey
ALTER TABLE "public"."Music" ADD CONSTRAINT "Music_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
