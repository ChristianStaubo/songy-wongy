import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { MUSIC_GENERATION_QUEUE, GENERATE_MUSIC_JOB } from '../queue.constants';
import { MusicGenerationRequestedEvent } from '../events/music-generation-event';

@Injectable()
export class MusicGenerationListener {
  private readonly logger = new Logger(MusicGenerationListener.name);

  constructor(
    @InjectQueue(MUSIC_GENERATION_QUEUE)
    private readonly musicGenerationQueue: Queue,
  ) {}

  @OnEvent('music.generation.requested')
  async handleMusicGenerationRequested(event: MusicGenerationRequestedEvent) {
    const { data } = event;

    this.logger.log(
      `📥 Received music generation request for music ID: ${data.musicId}`,
    );

    try {
      const job = await this.musicGenerationQueue.add(
        GENERATE_MUSIC_JOB,
        {
          musicId: data.musicId,
          userId: data.userId,
          name: data.name,
          prompt: data.prompt,
          lengthMs: data.lengthMs,
          outputFormat: data.outputFormat,
          modelId: data.modelId,
        },
        {
          // Use musicId as job ID to prevent duplicates
          jobId: `music-${data.musicId}`,
        },
      );

      this.logger.log(
        `✅ Queued music generation job ${job.id} for music ID: ${data.musicId}`,
      );

      return job;
    } catch (error) {
      if (error?.code === 'BULLMQDuplicateJob') {
        this.logger.log(
          `⚠️ Duplicate music generation job skipped for music ID: ${data.musicId}`,
        );
      } else {
        this.logger.error(
          `❌ Failed to queue music generation job for music ID ${data.musicId}:`,
          error.message,
        );
        throw error;
      }
    }
  }
}
