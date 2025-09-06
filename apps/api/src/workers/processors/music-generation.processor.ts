import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { MUSIC_GENERATION_QUEUE } from '../queue.constants';
import { GenerateMusicJobData } from '../types';
import { MusicGeneratorService } from '../../music-generator/music-generator.service';
import { PrismaService } from '../../prisma/prisma.service';
import { UsersService } from '../../users/users.service';
import { CreditsService } from '../../credits/credits.service';
import {
  MusicGenerationCompletedEvent,
  MusicGenerationFailedEvent,
} from '../events/music-generation-event';

@Processor(MUSIC_GENERATION_QUEUE)
export class MusicGenerationProcessor extends WorkerHost {
  private readonly logger = new Logger(MusicGenerationProcessor.name);

  constructor(
    private readonly musicGeneratorService: MusicGeneratorService,
    private readonly prismaService: PrismaService,
    private readonly usersService: UsersService,
    private readonly creditsService: CreditsService,
    private readonly eventEmitter: EventEmitter2,
  ) {
    super();
  }

  async process(job: Job<GenerateMusicJobData, string>) {
    this.logger.log(
      `🔄 Processing music generation job ${job.id} for music ID: ${job.data.musicId}`,
    );

    try {
      return await this.generateMusic(job);
    } catch (error) {
      this.logger.error(
        `❌ Failed to process music generation job ${job.id}:`,
        error.message,
      );

      // Handle credit refund and status update in atomic transaction
      await this.handleGenerationFailure(job.data.musicId, job.data.userId);

      // Emit failure event
      const failedEvent: MusicGenerationFailedEvent = {
        data: {
          musicId: job.data.musicId,
          userId: job.data.userId,
          error: error.message,
          failedAt: new Date().toISOString(),
        },
      };

      this.eventEmitter.emit('music.generation.failed', failedEvent);
      this.logger.log(
        `📤 Emitted music.generation.failed event for music ID: ${job.data.musicId}`,
      );

      throw error; // BullMQ will handle retries
    }
  }

  private async generateMusic(job: Job<GenerateMusicJobData, string>) {
    const { musicId, userId, name, prompt, lengthMs } = job.data;

    this.logger.log(
      `🎵 Generating music for music ID: ${musicId} with prompt: "${prompt}"`,
    );

    // Update database status to GENERATING
    await this.updateMusicStatus(musicId, 'GENERATING');

    // Generate music using the service
    const result = await this.musicGeneratorService.generateMusic({
      name,
      prompt,
      lengthMs,
      outputFormat: 'mp3_44100_128',
      modelId: 'music_v1',
    });

    // Update database with S3 URL and COMPLETED status
    await this.prismaService.music.update({
      where: { id: musicId },
      data: {
        audioUrl: result.s3Url,
        status: 'COMPLETED',
        updatedAt: new Date(),
      },
    });

    this.logger.log(`✅ Successfully generated music for music ID: ${musicId}`);

    // Emit completion event
    const completedEvent: MusicGenerationCompletedEvent = {
      data: {
        musicId,
        userId,
        s3Url: result.s3Url,
        s3Key: result.key,
        s3Bucket: result.bucket,
        metadata: result.metadata,
        completedAt: new Date().toISOString(),
      },
    };

    this.eventEmitter.emit('music.generation.completed', completedEvent);
    this.logger.log(
      `📤 Emitted music.generation.completed event for music ID: ${musicId}`,
    );

    return {
      musicId,
      s3Url: result.s3Url,
      s3Key: result.key,
      s3Bucket: result.bucket,
      completedAt: new Date().toISOString(),
      success: true,
    };
  }

  private async updateMusicStatus(
    musicId: string,
    status: 'GENERATING' | 'COMPLETED' | 'FAILED',
  ) {
    try {
      await this.prismaService.music.update({
        where: { id: musicId },
        data: {
          status,
          updatedAt: new Date(),
        },
      });

      this.logger.log(`📝 Updated music ID ${musicId} status to: ${status}`);
    } catch (error) {
      this.logger.error(
        `❌ Failed to update music ID ${musicId} status to ${status}:`,
        error.message,
      );
      // Don't throw here, as this is a secondary operation
    }
  }

  /**
   * Handle music generation failure by refunding credits and updating status
   */
  private async handleGenerationFailure(musicId: string, clerkId: string) {
    try {
      this.logger.log(
        `🔄 Handling generation failure for music ID: ${musicId}`,
      );

      // Get user by clerkId to get their database ID
      const user = await this.usersService.getUserByClerkId(clerkId);

      // Get the music record to check credits used
      const music = await this.prismaService.music.findUnique({
        where: { id: musicId },
        select: {
          creditsUsed: true,
          name: true,
        },
      });

      if (!music) {
        this.logger.error(`❌ Music record not found for ID: ${musicId}`);
        return;
      }

      const creditsToRefund = Number(music.creditsUsed);

      // Only refund if credits were actually deducted (> 0)
      if (creditsToRefund > 0) {
        // Use CreditsService to handle refund
        await this.creditsService.refundCredits(
          user.id,
          creditsToRefund,
          `Refund for failed generation: ${music.name}`,
        );

        this.logger.log(
          `💰 Refunded ${creditsToRefund} credits to user ${clerkId} for failed music generation`,
        );
      }

      // Update music record: set status to FAILED and reset creditsUsed to 0
      await this.prismaService.music.update({
        where: { id: musicId },
        data: {
          status: 'FAILED',
          creditsUsed: 0, // Reset to 0 since refunded
          updatedAt: new Date(),
        },
      });

      this.logger.log(
        `📝 Updated music ID ${musicId} status to FAILED and reset credits`,
      );
    } catch (error) {
      this.logger.error(
        `❌ Failed to handle generation failure for music ID ${musicId}:`,
        error.message,
      );
      // Don't throw here - this is cleanup, main error should still propagate
    }
  }
}
