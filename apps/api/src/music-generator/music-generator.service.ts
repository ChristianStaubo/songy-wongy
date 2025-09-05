import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { EventEmitter2 } from '@nestjs/event-emitter';
import {
  GenerateMusicDto,
  MusicGenerationRequestResponse,
  MusicStatusResponse,
  MusicDownloadResponse,
  UserMusicListResponse,
} from '@repo/types';
import { Readable } from 'stream';
import { S3Service } from '../s3/s3.service';
import { PrismaService } from '../prisma/prisma.service';
import { UsersService } from '../users/users.service';
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
    private usersService: UsersService,
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
    clerkId: string,
  ): Promise<MusicGenerationRequestResponse> {
    this.logger.log(`Creating music generation request for user: ${clerkId}`);

    // Get user by clerkId to get their database ID
    const user = await this.usersService.getUserByClerkId(clerkId);

    // Calculate estimated credits needed (1 credit per minute, rounded up)
    const estimatedCredits = Math.ceil((options.lengthMs || 10000) / 60000);

    // TODO: Implement credit balance validation and deduction transaction creation
    // - Check if user has sufficient credits
    // - Create DEDUCTION transaction
    // - Link transaction to music record

    // Create Music record in database using the user's database ID
    const musicRecord = await this.prismaService.music.create({
      data: {
        name: options.name,
        prompt: options.prompt,
        lengthMs: options.lengthMs || 10000, // Default to 10 seconds
        status: 'GENERATING',
        audioUrl: null, // Will be updated by worker when generation completes
        userId: user.id, // Use the database ID, not clerkId
        creditsUsed: estimatedCredits,
        // transactionId will be set when credit deduction transaction is created
      },
    });

    this.logger.log(`Created music record with ID: ${musicRecord.id}`);

    // Emit event to trigger worker queue processing
    const musicGenerationEvent: MusicGenerationRequestedEvent = {
      data: {
        musicId: musicRecord.id,
        userId: clerkId, // Use clerkId for the event (worker will handle user lookup)
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
    clerkId: string,
  ): Promise<MusicStatusResponse> {
    // Get user by clerkId to get their database ID
    const user = await this.usersService.getUserByClerkId(clerkId);

    const music = await this.prismaService.music.findFirst({
      where: {
        id: musicId,
        userId: user.id, // Use database ID for the foreign key
      },
    });

    if (!music) {
      throw new Error('Music record not found');
    }

    const response: MusicStatusResponse = {
      musicId: music.id,
      name: music.name,
      prompt: music.prompt,
      status: music.status as 'GENERATING' | 'COMPLETED' | 'FAILED',
      lengthMs: music.lengthMs,
      audioUrl: music.audioUrl || null,
      createdAt: music.createdAt.toISOString(),
      updatedAt: music.updatedAt.toISOString(),
    };

    return response;
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
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
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
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
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

  /**
   * Get presigned download URL for a completed music track
   */
  async getDownloadUrl(
    musicId: string,
    clerkId: string,
  ): Promise<MusicDownloadResponse> {
    this.logger.log(
      `Getting download URL for music ${musicId} by user ${clerkId}`,
    );

    // First, get the music record to verify ownership and get the S3 URL
    const music = await this.getMusicStatus(musicId, clerkId);

    if (music.status !== 'COMPLETED') {
      throw new Error('Music file is not ready for download');
    }

    if (!music.audioUrl) {
      throw new Error('Music file URL not found');
    }

    // Extract bucket and key from the S3 URL
    // URL format: https://songy-wongy-music.s3.us-east-1.amazonaws.com/music/filename.mp3
    const url = new URL(music.audioUrl);
    const bucket = url.hostname.split('.')[0]; // Extract bucket name from hostname
    const key = url.pathname.substring(1); // Remove leading slash

    this.logger.log(
      `Generating download URL for bucket: ${bucket}, key: ${key}`,
    );

    // Generate presigned download URL (expires in 1 hour)
    const downloadUrl = await this.s3Service.getPresignedDownloadUrl(
      bucket,
      key,
      3600, // 1 hour expiration
    );

    // Extract filename for suggested download name
    const fileName = key.split('/').pop() || 'music.mp3';
    const friendlyFileName =
      fileName.replace(/_/g, ' ').replace('.mp3', '') + '.mp3';

    return {
      downloadUrl,
      expiresIn: 3600,
      fileName: friendlyFileName,
    };
  }

  /**
   * Get all music generated by a user with pagination
   */
  async getUserMusic(
    clerkId: string,
    page = 1,
    limit = 10,
  ): Promise<UserMusicListResponse> {
    this.logger.log(
      `Getting music for user ${clerkId}, page ${page}, limit ${limit}`,
    );

    // Get user from clerkId
    const user = await this.usersService.getUserByClerkId(clerkId);

    // Calculate skip for pagination
    const skip = (page - 1) * limit;

    // Get music records with pagination
    const [music, total] = await Promise.all([
      this.prismaService.music.findMany({
        where: { userId: user.id },
        select: {
          id: true,
          name: true,
          prompt: true,
          status: true,
          lengthMs: true,
          audioUrl: true,
          createdAt: true,
          updatedAt: true,
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prismaService.music.count({
        where: { userId: user.id },
      }),
    ]);

    const response: UserMusicListResponse = {
      music: music.map((track) => ({
        id: track.id,
        name: track.name,
        prompt: track.prompt,
        status: track.status,
        lengthMs: track.lengthMs,
        audioUrl: track.audioUrl,
        createdAt: track.createdAt.toISOString(),
        updatedAt: track.updatedAt.toISOString(),
      })),
      total,
      page,
      limit,
    };

    return response;
  }
}
