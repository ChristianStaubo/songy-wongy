import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { EventEmitter2 } from '@nestjs/event-emitter';
import {
  GenerateMusicDto,
  MusicGenerationRequestResponse,
  MusicStatusResponse,
} from '@repo/types';
import { Readable } from 'stream';
import { S3Service } from '../s3/s3.service';
import { PrismaService } from '../prisma/prisma.service';
import { MusicGenerationRequestedEvent } from '../workers/events/music-generation-event';

@Injectable()
export class MusicGeneratorService {
  private readonly logger = new Logger(MusicGeneratorService.name);
  private readonly apiKey: string;
  private readonly baseUrl = 'https://api.elevenlabs.io/v1';
  private readonly bucket: string;

  constructor(
    private configService: ConfigService,
    private s3Service: S3Service,
    private prismaService: PrismaService,
    private eventEmitter: EventEmitter2,
  ) {
    this.apiKey = this.configService.get<string>('ELEVENLABS_API_KEY');
    this.bucket = this.configService.get<string>('AWS_S3_MUSIC_BUCKET');

    if (!this.apiKey) {
      this.logger.warn('ELEVENLABS_API_KEY not found in environment variables');
      throw new Error('ELEVENLABS_API_KEY is required');
    }

    if (!this.bucket) {
      this.logger.warn(
        'AWS_S3_MUSIC_BUCKET not found in environment variables',
      );
      throw new Error('AWS_S3_MUSIC_BUCKET is required');
    }
  }

  /**
   * Request music generation (async workflow)
   * Creates database record and emits event for worker queue processing
   */
  async requestMusicGeneration(
    options: GenerateMusicDto,
    userId: string,
  ): Promise<MusicGenerationRequestResponse> {
    // TODO: Validate user has permission/credits for music generation

    this.logger.log(`Creating music generation request for user: ${userId}`);

    // Create Music record in database
    const musicRecord = await this.prismaService.music.create({
      data: {
        name: options.name,
        prompt: options.prompt,
        lengthMs: options.lengthMs || 10000, // Default to 10 seconds
        status: 'GENERATING',
        audioUrl: '', // Will be updated by worker
        userId,
      },
    });

    this.logger.log(`Created music record with ID: ${musicRecord.id}`);

    // Emit event to trigger worker queue processing
    const musicGenerationEvent: MusicGenerationRequestedEvent = {
      data: {
        musicId: musicRecord.id,
        userId,
        name: options.name,
        prompt: options.prompt,
        lengthMs: options.lengthMs,
        outputFormat: options.outputFormat,
        modelId: options.modelId,
      },
    };

    this.eventEmitter.emit('music.generation.requested', musicGenerationEvent);

    this.logger.log(
      `📤 Emitted music.generation.requested event for music ID: ${musicRecord.id}`,
    );

    const response: MusicGenerationRequestResponse = {
      musicId: musicRecord.id,
      name: musicRecord.name,
      prompt: musicRecord.prompt,
      status: 'GENERATING',
      lengthMs: musicRecord.lengthMs,
      createdAt: musicRecord.createdAt.toISOString(),
    };

    return response;
  }

  /**
   * Get music generation status
   */
  async getMusicStatus(
    musicId: string,
    userId: string,
  ): Promise<MusicStatusResponse> {
    const music = await this.prismaService.music.findFirst({
      where: {
        id: musicId,
        userId, // Ensure user can only access their own music
      },
    });

    if (!music) {
      throw new Error('Music record not found');
    }

    return {
      musicId: music.id,
      name: music.name,
      prompt: music.prompt,
      status: music.status as 'GENERATING' | 'COMPLETED' | 'FAILED',
      lengthMs: music.lengthMs,
      audioUrl: music.audioUrl || null,
      createdAt: music.createdAt.toISOString(),
      updatedAt: music.updatedAt.toISOString(),
    };
  }

  /**
   * Generate music using ElevenLabs API and store in S3
   * Returns S3 URL and metadata
   */
  async generateMusic(options: GenerateMusicDto): Promise<{
    s3Url: string;
    key: string;
    bucket: string;
    metadata: {
      name: string;
      prompt: string;
      lengthMs?: number;
      outputFormat: string;
      modelId: string;
      generatedAt: string;
    };
  }> {
    const stream = await this.generateMusicStream(options);

    // Generate S3 key
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const sanitizedName = options.name.replace(/[^a-zA-Z0-9-_]/g, '_');
    const extension = this.getFileExtension(
      options.outputFormat || 'mp3_44100_128',
    );
    const key = `music/${timestamp}_${sanitizedName}.${extension}`;

    // Convert stream to buffer for S3 upload
    const buffer = await this.streamToBuffer(stream);

    // Prepare metadata
    const metadata = {
      name: options.name,
      prompt: options.prompt,
      lengthMs: options.lengthMs,
      outputFormat: options.outputFormat || 'mp3_44100_128',
      modelId: options.modelId || 'music_v1',
      generatedAt: new Date().toISOString(),
    };

    // Upload to S3
    const contentType = this.getContentType(
      options.outputFormat || 'mp3_44100_128',
    );
    const s3Url = await this.s3Service.uploadBuffer(
      this.bucket,
      key,
      buffer,
      contentType,
      {
        name: metadata.name,
        prompt: metadata.prompt,
        outputFormat: metadata.outputFormat,
        modelId: metadata.modelId,
        generatedAt: metadata.generatedAt,
        ...(metadata.lengthMs && { lengthMs: metadata.lengthMs.toString() }),
      },
    );

    this.logger.log(`Music uploaded to S3: ${s3Url}`);

    return {
      s3Url,
      key,
      bucket: this.bucket,
      metadata,
    };
  }

  /**
   * Generate music using ElevenLabs API
   * Returns a readable stream of audio data (internal method)
   */
  private async generateMusicStream(
    options: GenerateMusicDto,
  ): Promise<Readable> {
    try {
      const {
        prompt,
        lengthMs,
        outputFormat = 'mp3_44100_128',
        modelId = 'music_v1',
      } = options;

      this.logger.log(`Generating music with prompt: "${prompt}"`);

      // Build query parameters
      const queryParams = new URLSearchParams();
      if (outputFormat) {
        queryParams.append('output_format', outputFormat);
      }

      // Build request body
      const requestBody: any = {
        model_id: modelId,
      };

      if (prompt) {
        requestBody.prompt = prompt;
        if (lengthMs) {
          requestBody.music_length_ms = lengthMs;
        }
      }

      const url = `${this.baseUrl}/music?${queryParams.toString()}`;

      this.logger.log(`Making request to: ${url}`);
      this.logger.log(`Request body: ${JSON.stringify(requestBody)}`);

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'xi-api-key': this.apiKey,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) {
        const errorText = await response.text();
        this.logger.error(
          `ElevenLabs API error: ${response.status} ${response.statusText}`,
        );
        this.logger.error(`Error response: ${errorText}`);
        throw new Error(
          `ElevenLabs API error: ${response.status} ${response.statusText} - ${errorText}`,
        );
      }

      this.logger.log('Music generation completed successfully');

      // Convert the response body to a readable stream
      if (!response.body) {
        throw new Error('No response body received from ElevenLabs API');
      }

      // Convert Web ReadableStream to Node.js Readable stream
      return Readable.fromWeb(response.body as any);
    } catch (error) {
      this.logger.error('Failed to generate music:', error);
      throw error;
    }
  }

  /**
   * Convert a readable stream to buffer (utility method)
   */
  async streamToBuffer(stream: Readable): Promise<Buffer> {
    const chunks: Buffer[] = [];

    return new Promise((resolve, reject) => {
      stream.on('data', (chunk) => chunks.push(Buffer.from(chunk)));
      stream.on('error', (err) => reject(err));
      stream.on('end', () => resolve(Buffer.concat(chunks)));
    });
  }

  /**
   * Get file extension from output format
   */
  private getFileExtension(outputFormat: string): string {
    if (outputFormat.startsWith('mp3_')) {
      return 'mp3';
    }
    if (outputFormat.startsWith('pcm_')) {
      return 'wav';
    }
    if (outputFormat === 'ulaw_8000') {
      return 'wav';
    }
    return 'mp3'; // Default fallback
  }

  /**
   * Get content type from output format
   */
  private getContentType(outputFormat: string): string {
    if (outputFormat.startsWith('mp3_')) {
      return 'audio/mpeg';
    }
    if (outputFormat.startsWith('pcm_') || outputFormat === 'ulaw_8000') {
      return 'audio/wav';
    }
    return 'audio/mpeg'; // Default fallback
  }
}
