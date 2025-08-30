import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { MUSIC_GENERATION_QUEUE } from '../queue.constants';
import { GenerateMusicJobData } from '../types';
import { MusicGeneratorService } from '../../music-generator/music-generator.service';
import { PrismaService } from '../../prisma/prisma.service';
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

      // Update database status to FAILED
      await this.updateMusicStatus(job.data.musicId, 'FAILED');

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
    const { musicId, userId, name, prompt, lengthMs, outputFormat, modelId } =
      job.data;

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
}
