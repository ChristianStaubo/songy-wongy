import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Readable } from 'stream';

export interface MusicGenerationOptions {
  prompt?: string;
  musicLengthMs?: number;
  outputFormat?: string;
  modelId?: string;
}

@Injectable()
export class MusicGeneratorService {
  private readonly logger = new Logger(MusicGeneratorService.name);
  private readonly apiKey: string;
  private readonly baseUrl = 'https://api.elevenlabs.io/v1';

  constructor(private configService: ConfigService) {
    this.apiKey = this.configService.get<string>('ELEVENLABS_API_KEY');
    if (!this.apiKey) {
      this.logger.warn('ELEVENLABS_API_KEY not found in environment variables');
      throw new Error('ELEVENLABS_API_KEY is required');
    }
  }

  /**
   * Generate music using ElevenLabs API
   * Returns a readable stream of audio data
   */
  async generateMusic(options: MusicGenerationOptions): Promise<Readable> {
    try {
      const {
        prompt,
        musicLengthMs,
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
        if (musicLengthMs) {
          requestBody.music_length_ms = musicLengthMs;
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
   * Generate music from a simple text prompt (convenience method)
   */
  async generateMusicFromPrompt(
    prompt: string,
    lengthMs?: number,
  ): Promise<Readable> {
    return this.generateMusic({
      prompt,
      musicLengthMs: lengthMs || 10000, // Default to 10 seconds (ElevenLabs minimum)
    });
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
}
