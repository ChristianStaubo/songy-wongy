import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AIProvider, Transaction } from '@prisma/client';
import { InsufficientCreditsException } from './exceptions/insufficient-credits.exception';

@Injectable()
export class CreditsService {
  private readonly logger = new Logger(CreditsService.name);

  constructor(private readonly prismaService: PrismaService) {}

  /**
   * Check user's current credit balance
   */
  async checkBalance(userId: string): Promise<number> {
    const user = await this.prismaService.user.findUnique({
      where: { id: userId },
      select: { creditBalance: true },
    });

    if (!user) {
      throw new Error('User not found');
    }

    return Number(user.creditBalance);
  }

  /**
   * Check if user has sufficient credits for a transaction
   */
  async hasSufficientCredits(
    userId: string,
    creditsNeeded: number,
  ): Promise<boolean> {
    const currentBalance = await this.checkBalance(userId);
    return currentBalance >= creditsNeeded;
  }

  /**
   * Calculate credits needed based on length and provider pricing
   */
  async calculateCreditsNeeded(
    lengthMs: number,
    provider: AIProvider,
  ): Promise<number> {
    // Get current pricing for the provider
    const pricingTier = await this.prismaService.pricingTier.findFirst({
      where: {
        provider,
        isDefault: true,
        isActive: true,
      },
    });

    if (!pricingTier) {
      throw new Error(`No active pricing tier found for ${provider} provider`);
    }

    // Calculate credits needed (rounded up to nearest credit)
    const lengthMinutes = lengthMs / 60000;
    const creditsNeeded = Math.ceil(
      lengthMinutes * Number(pricingTier.creditsPerMinute),
    );

    this.logger.log(
      `Credits calculation: ${lengthMs}ms = ${lengthMinutes.toFixed(2)} minutes × ${pricingTier.creditsPerMinute} credits/min = ${creditsNeeded} credits`,
    );

    return creditsNeeded;
  }

  /**
   * Deduct credits from user account in atomic transaction
   */
  async deductCredits(
    userId: string,
    creditsNeeded: number,
    description: string,
  ): Promise<Transaction> {
    return await this.prismaService.$transaction(async (tx) => {
      // Check user has sufficient credits (lock user row for update)
      const userWithBalance = await tx.user.findUnique({
        where: { id: userId },
        select: { creditBalance: true },
      });

      if (!userWithBalance) {
        throw new Error('User not found');
      }

      const currentBalance = Number(userWithBalance.creditBalance);
      if (currentBalance < creditsNeeded) {
        throw new InsufficientCreditsException(creditsNeeded, currentBalance);
      }

      // Create deduction transaction
      const transaction = await tx.transaction.create({
        data: {
          userId,
          type: 'DEDUCTION',
          amount: -creditsNeeded,
          description,
          status: 'COMPLETED',
        },
      });

      // Update cached credit balance
      await tx.user.update({
        where: { id: userId },
        data: { creditBalance: { decrement: creditsNeeded } },
      });

      this.logger.log(
        `✅ Deducted ${creditsNeeded} credits from user ${userId}: ${description}`,
      );

      return transaction;
    });
  }

  /**
   * Refund credits to user account in atomic transaction
   */
  async refundCredits(
    userId: string,
    creditsToRefund: number,
    description: string,
  ): Promise<Transaction> {
    return await this.prismaService.$transaction(async (tx) => {
      // Create refund transaction
      const transaction = await tx.transaction.create({
        data: {
          userId,
          type: 'REFUND',
          amount: creditsToRefund, // Positive amount for refund
          description,
          status: 'COMPLETED',
        },
      });

      // Update cached credit balance
      await tx.user.update({
        where: { id: userId },
        data: { creditBalance: { increment: creditsToRefund } },
      });

      this.logger.log(
        `💰 Refunded ${creditsToRefund} credits to user ${userId}: ${description}`,
      );

      return transaction;
    });
  }

  /**
   * Get current pricing tier for a provider
   */
  async getCurrentPricing(provider: AIProvider): Promise<{
    id: string;
    provider: AIProvider;
    name: string;
    creditsPerMinute: number;
  }> {
    const pricingTier = await this.prismaService.pricingTier.findFirst({
      where: {
        provider,
        isDefault: true,
        isActive: true,
      },
      select: {
        id: true,
        provider: true,
        name: true,
        creditsPerMinute: true,
      },
    });

    if (!pricingTier) {
      throw new Error(`No active pricing tier found for ${provider} provider`);
    }

    return {
      ...pricingTier,
      creditsPerMinute: Number(pricingTier.creditsPerMinute),
    };
  }
}
