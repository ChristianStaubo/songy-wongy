import { z } from 'zod';

// Music status enum
export const musicStatusSchema = z.enum(['GENERATING', 'COMPLETED', 'FAILED']);

// Response schema for music generation
export const generateMusicResponse = z.object({
  id: z.string().describe('Unique identifier for the music'),
  name: z.string().describe('Name of the music track'),
  prompt: z.string().describe('Original prompt used to generate the music'),
  audioUrl: z.string().url().describe('URL to the generated audio file'),
  lengthMs: z.number().describe('Length of the music in milliseconds'),
  status: musicStatusSchema.describe('Status of the music generation'),
  userId: z.string().describe('ID of the user who created the music'),
  createdAt: z.string().datetime().describe('When the music was created (ISO string)'),
  updatedAt: z.string().datetime().describe('When the music was last updated (ISO string)'),
});

// Music generation request response (async workflow)
export const musicGenerationRequestResponse = z.object({
  musicId: z.string().describe('Unique ID for the music record'),
  name: z.string().describe('Name of the music track'),
  prompt: z.string().describe('Generation prompt used'),
  status: z.literal('GENERATING').describe('Initial status'),
  lengthMs: z.number().describe('Requested length in milliseconds'),
  createdAt: z.string().datetime().describe('Creation timestamp'),
});

// Music status response (polling endpoint)
export const musicStatusResponse = z.object({
  musicId: z.string().describe('Unique ID for the music record'),
  name: z.string().describe('Name of the music track'),
  prompt: z.string().describe('Generation prompt used'),
  status: musicStatusSchema.describe('Current status'),
  lengthMs: z.number().describe('Length in milliseconds'),
  audioUrl: z.string().url().nullable().describe('S3 URL (available when status=COMPLETED)'),
  createdAt: z.string().datetime().describe('Creation timestamp'),
  updatedAt: z.string().datetime().describe('Last update timestamp'),
});

// Buffer response schema for testing endpoint
export const musicBufferResponse = z.object({
  audioBase64: z.string().describe('Base64 encoded audio data'),
  size: z.number().describe('Size of the audio file in bytes'),
});

// TypeScript types
export type MusicStatus = z.infer<typeof musicStatusSchema>;
export type GenerateMusicResponse = z.infer<typeof generateMusicResponse>;
export type MusicGenerationRequestResponse = z.infer<typeof musicGenerationRequestResponse>;
export type MusicStatusResponse = z.infer<typeof musicStatusResponse>;
export type MusicBufferResponse = z.infer<typeof musicBufferResponse>;

