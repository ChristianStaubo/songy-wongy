import {
  Controller,
  Post,
  Get,
  Body,
  Param,
  UseGuards,
  Logger,
  InternalServerErrorException,
  NotFoundException,
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
   * Creates a music record and queues generation job for background processing
   */
  @Post('generate')
  @UseGuards(ClerkAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: 'Generate music from text prompt',
    description:
      'Creates a music generation job and returns immediately. Use the returned musicId to poll for completion status.',
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
    description: 'Music generation job created successfully',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean', example: true },
        data: {
          type: 'object',
          properties: {
            musicId: {
              type: 'string',
              description: 'Unique ID for the music record',
            },
            name: { type: 'string', description: 'Name of the music track' },
            prompt: { type: 'string', description: 'Generation prompt used' },
            status: {
              type: 'string',
              enum: ['GENERATING'],
              description: 'Current status',
            },
            lengthMs: {
              type: 'number',
              description: 'Requested length in milliseconds',
            },
            createdAt: { type: 'string', description: 'Creation timestamp' },
          },
        },
        message: {
          type: 'string',
          example: 'Music generation job created successfully',
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
    // Delegate to service layer - service handles all business logic
    return await this.musicGeneratorService.requestMusicGeneration(
      generateMusicDto,
      clerkId,
    );
  }

  /**
   * Get music generation status
   * Returns current status and metadata for a music generation job
   */
  @Get('status/:musicId')
  @UseGuards(ClerkAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: 'Get music generation status',
    description: 'Check the current status of a music generation job',
  })
  @ApiResponse({
    status: 200,
    description: 'Music status retrieved successfully',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean' },
        data: {
          type: 'object',
          properties: {
            musicId: { type: 'string' },
            name: { type: 'string' },
            prompt: { type: 'string' },
            status: {
              type: 'string',
              enum: ['GENERATING', 'COMPLETED', 'FAILED'],
            },
            lengthMs: { type: 'number' },
            audioUrl: {
              type: 'string',
              description: 'S3 URL (available when status=COMPLETED)',
            },
            createdAt: { type: 'string' },
            updatedAt: { type: 'string' },
          },
        },
      },
    },
  })
  @ApiResponse({
    status: 404,
    description: 'Music record not found',
  })
  async getMusicStatus(
    @Param('musicId') musicId: string,
    @GetClerkId() clerkId: string,
  ) {
    // Delegate to service layer - let NestJS handle exceptions
    const result = await this.musicGeneratorService.getMusicStatus(
      musicId,
      clerkId,
    );

    return {
      success: true,
      data: result,
    };
  }
}
