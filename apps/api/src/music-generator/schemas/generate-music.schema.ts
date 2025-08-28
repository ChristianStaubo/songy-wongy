import { z } from 'zod';
import { createZodDto } from 'nestjs-zod';

// Zod schema for music generation
export const generateMusicSchema = z.object({
  name: z
    .string()
    .min(1, 'Name is required')
    .max(100, 'Name must be less than 100 characters')
    .describe('Name for the generated music track'),

  prompt: z
    .string()
    .min(1, 'Prompt is required')
    .max(2000, 'Prompt must be less than 2000 characters')
    .describe('Text prompt describing the music to generate'),

  lengthMs: z
    .number()
    .int()
    .min(10000, 'Length must be at least 10000ms (10 seconds)')
    .max(300000, 'Length must be at most 300000ms (5 minutes)')
    .optional()
    .describe('Length of the generated music in milliseconds'),
});

// Response schema for music generation
export const musicResponseSchema = z.object({
  id: z.string().describe('Unique identifier for the music'),
  name: z.string().describe('Name of the music track'),
  prompt: z.string().describe('Original prompt used to generate the music'),
  audioUrl: z.string().url().describe('URL to the generated audio file'),
  lengthMs: z.number().describe('Length of the music in milliseconds'),
  status: z
    .enum(['GENERATING', 'COMPLETED', 'FAILED'])
    .describe('Status of the music generation'),
  userId: z.string().describe('ID of the user who created the music'),
  createdAt: z.date().describe('When the music was created'),
  updatedAt: z.date().describe('When the music was last updated'),
});

// Buffer response schema for testing endpoint
export const musicBufferResponseSchema = z.object({
  audioBase64: z.string().describe('Base64 encoded audio data'),
  size: z.number().describe('Size of the audio file in bytes'),
});

// Create DTOs from Zod schemas
export class GenerateMusicZodDto extends createZodDto(generateMusicSchema) {}
export class MusicResponseZodDto extends createZodDto(musicResponseSchema) {}
export class MusicBufferResponseZodDto extends createZodDto(
  musicBufferResponseSchema,
) {}

// Export types for use in services
export type GenerateMusicInput = z.infer<typeof generateMusicSchema>;
export type MusicResponse = z.infer<typeof musicResponseSchema>;
export type MusicBufferResponse = z.infer<typeof musicBufferResponseSchema>;
