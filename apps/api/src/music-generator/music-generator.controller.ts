import {
  Controller,
  Post,
  Body,
  HttpException,
  HttpStatus,
  Res,
  UseGuards,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiBody,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { Response } from 'express';
import { MusicGeneratorService } from './music-generator.service';
import { ClerkAuthGuard } from 'src/auth/guards/clerk-auth-guard';
import { GetClerkId } from 'src/auth/decorators/get-clerk-id-decorator';
import { type GenerateMusicDto } from './dto/music-generation.dto';

// Using Zod DTO from schemas - no need to redefine here

// Using Zod DTO for buffer response from schemas - no need to redefine here

@ApiTags('Music Generation')
@Controller('music-generator')
export class MusicGeneratorController {
  constructor(private readonly musicGeneratorService: MusicGeneratorService) {}

  /**
   * Generate music from a text prompt
   * Returns audio file as streaming binary data
   */
  @Post('generate')
  @UseGuards(ClerkAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: 'Generate music from text prompt',
    description:
      'Generate an audio file from a text description. Returns the audio as a downloadable MP3 file. Requires authentication.',
  })
  @ApiBody({
    description: 'Music generation parameters',
    schema: {
      type: 'object',
      properties: {
        name: {
          type: 'string',
          minLength: 1,
          maxLength: 100,
          description: 'Name for the generated music track',
          example: 'My Awesome Song',
        },
        prompt: {
          type: 'string',
          minLength: 1,
          maxLength: 2000,
          description: 'Text prompt describing the music to generate',
          example: 'upbeat electronic dance music with synthesizers',
        },
        lengthMs: {
          type: 'number',
          minimum: 10000,
          maximum: 300000,
          description: 'Length of the generated music in milliseconds',
          example: 30000,
        },
      },
      required: ['name', 'prompt'],
    },
  })
  @ApiResponse({
    status: 200,
    description: 'Successfully generated music file',
    content: {
      'audio/mpeg': {
        schema: {
          type: 'string',
          format: 'binary',
        },
      },
    },
  })
  @ApiResponse({
    status: 400,
    description: 'Bad request - invalid prompt or length',
    schema: {
      type: 'object',
      properties: {
        message: { type: 'string' },
        error: { type: 'string' },
        statusCode: { type: 'number' },
      },
    },
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - authentication required',
  })
  @ApiResponse({
    status: 500,
    description: 'Internal server error - music generation failed',
  })
  async generateMusic(
    @Body() generateMusicDto: GenerateMusicDto,
    @GetClerkId() clerkId: string,
    @Res() res: Response,
  ) {
    try {
      const { name, prompt, lengthMs } = generateMusicDto;
      // Zod validation handles all input validation automatically

      // TODO:
      // 1. Create Music record in database with status=GENERATING
      // 2. Generate music with ElevenLabs
      // 3. Upload audio stream to S3
      // 4. Update Music record with audioUrl and status=COMPLETED
      // 5. Return the Music record instead of streaming directly

      const audioStream =
        await this.musicGeneratorService.generateMusicFromPrompt(
          prompt,
          lengthMs,
        );

      // Set appropriate headers for audio file
      res.set({
        'Content-Type': 'audio/mpeg',
        'Content-Disposition': `attachment; filename="${name.replace(/[^a-zA-Z0-9]/g, '_')}.mp3"`,
        'Transfer-Encoding': 'chunked',
      });

      // Pipe the stream directly to the response
      audioStream.pipe(res);

      // Handle stream errors
      audioStream.on('error', (error) => {
        console.error('Stream error:', error);
        if (!res.headersSent) {
          res.status(500).json({ error: 'Failed to generate music' });
        }
      });
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      throw new HttpException(
        'Failed to generate music',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
}
