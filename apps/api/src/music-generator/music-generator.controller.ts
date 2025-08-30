import {
  Controller,
  Post,
  Body,
  UseGuards,
  Logger,
  InternalServerErrorException,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiBody,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { MusicGeneratorService } from './music-generator.service';
import { ClerkAuthGuard } from 'src/auth/guards/clerk-auth-guard';
import { GetClerkId } from 'src/auth/decorators/get-clerk-id-decorator';
import { GenerateMusicDto } from '@repo/types';

@ApiTags('Music Generation')
@Controller('music-generator')
export class MusicGeneratorController {
  private readonly logger = new Logger(MusicGeneratorController.name);

  constructor(private readonly musicGeneratorService: MusicGeneratorService) {}

  /**
   * Generate music from a text prompt
   * Returns S3 URL and metadata of the generated audio file
   */
  @Post('generate')
  @UseGuards(ClerkAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: 'Generate music from text prompt',
    description:
      'Generate an audio file from a text description and upload it to S3. Returns S3 URL and metadata. Requires authentication.',
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
    description: 'Successfully generated music file and uploaded to S3',
    schema: {
      type: 'object',
      properties: {
        s3Url: {
          type: 'string',
          description: 'S3 URL of the generated music file',
        },
        key: { type: 'string', description: 'S3 object key' },
        bucket: { type: 'string', description: 'S3 bucket name' },
        metadata: {
          type: 'object',
          properties: {
            name: { type: 'string' },
            prompt: { type: 'string' },
            lengthMs: { type: 'number' },
            outputFormat: { type: 'string' },
            modelId: { type: 'string' },
            generatedAt: { type: 'string' },
          },
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
  ) {
    try {
      // Zod validation handles all input validation automatically

      // TODO:
      // 1. Create Music record in database with status=GENERATING
      // 2. Update Music record with audioUrl and status=COMPLETED after S3 upload
      // 3. Associate music with user (clerkId)

      const result =
        await this.musicGeneratorService.generateMusic(generateMusicDto);

      return {
        success: true,
        data: result,
        message: 'Music generated and uploaded successfully',
      };
    } catch (error) {
      this.logger.error('Error generating music:', error);
      throw new InternalServerErrorException('Failed to generate music');
    }
  }
}
