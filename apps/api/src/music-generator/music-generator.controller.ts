import {
  Controller,
  Post,
  Get,
  Body,
  Param,
  Query,
  UseGuards,
  Logger,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiBody,
  ApiResponse,
  ApiBearerAuth,
  ApiQuery,
} from '@nestjs/swagger';
import { MusicGeneratorService } from './music-generator.service';
import { ClerkAuthGuard } from 'src/auth/guards/clerk-auth-guard';
import { GetClerkId } from 'src/auth/decorators/get-clerk-id-decorator';
import { GenerateMusicDto, GetUserMusicDto } from '@repo/types';

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
    return await this.musicGeneratorService.getMusicStatus(musicId, clerkId);
  }

  /**
   * Get presigned download URL for a completed music track
   * Returns a temporary download URL that expires in 1 hour
   */
  @Get('download/:musicId')
  @UseGuards(ClerkAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: 'Get download URL for music track',
    description:
      'Generate a presigned URL to download the completed music file',
  })
  @ApiResponse({
    status: 200,
    description: 'Download URL generated successfully',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean', example: true },
        data: {
          type: 'object',
          properties: {
            downloadUrl: {
              type: 'string',
              description:
                'Presigned URL for downloading the music file (expires in 1 hour)',
              example:
                'https://songy-wongy-music.s3.amazonaws.com/music/file.mp3?X-Amz-Algorithm=...',
            },
            expiresIn: {
              type: 'number',
              description: 'URL expiration time in seconds',
              example: 3600,
            },
            fileName: {
              type: 'string',
              description: 'Suggested filename for download',
              example: 'My_Awesome_Song.mp3',
            },
          },
        },
      },
    },
  })
  @ApiResponse({
    status: 404,
    description: 'Music record not found or not completed',
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - authentication required',
  })
  async getDownloadUrl(
    @Param('musicId') musicId: string,
    @GetClerkId() clerkId: string,
  ) {
    return this.musicGeneratorService.getDownloadUrl(musicId, clerkId);
  }

  /**
   * Get all music generated by the authenticated user
   * Returns paginated list of user's music tracks
   */
  @Get('music')
  @UseGuards(ClerkAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: "Get user's generated music",
    description:
      'Retrieve a paginated list of all music tracks generated by the authenticated user',
  })
  @ApiQuery({
    name: 'page',
    required: false,
    type: Number,
    description: 'Page number (default: 1)',
    example: 1,
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    type: Number,
    description: 'Number of items per page (default: 10, max: 100)',
    example: 10,
  })
  @ApiResponse({
    status: 200,
    description: 'User music retrieved successfully',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean', example: true },
        data: {
          type: 'object',
          properties: {
            music: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  id: { type: 'string', description: 'Unique music ID' },
                  name: { type: 'string', description: 'Music track name' },
                  prompt: { type: 'string', description: 'Generation prompt' },
                  status: {
                    type: 'string',
                    enum: ['GENERATING', 'COMPLETED', 'FAILED'],
                    description: 'Current status',
                  },
                  lengthMs: {
                    type: 'number',
                    description: 'Length in milliseconds',
                  },
                  audioUrl: {
                    type: 'string',
                    nullable: true,
                    description: 'S3 URL (when completed)',
                  },
                  createdAt: {
                    type: 'string',
                    description: 'Creation timestamp',
                  },
                  updatedAt: {
                    type: 'string',
                    description: 'Last update timestamp',
                  },
                },
              },
            },
            total: { type: 'number', description: 'Total number of tracks' },
            page: { type: 'number', description: 'Current page' },
            limit: { type: 'number', description: 'Items per page' },
          },
        },
      },
    },
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - authentication required',
  })
  async getUserMusic(
    @GetClerkId() clerkId: string,
    @Query() query: GetUserMusicDto,
  ) {
    const page =
      typeof query.page === 'string' ? parseInt(query.page, 10) : query.page;
    const limit =
      typeof query.limit === 'string' ? parseInt(query.limit, 10) : query.limit;

    return this.musicGeneratorService.getUserMusic(clerkId, page, limit);
  }
}
