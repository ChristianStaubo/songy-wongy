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

// Buffer response schema for testing endpoint
export const musicBufferResponse = z.object({
  audioBase64: z.string().describe('Base64 encoded audio data'),
  size: z.number().describe('Size of the audio file in bytes'),
});

// TypeScript types
export type MusicStatus = z.infer<typeof musicStatusSchema>;
export type GenerateMusicResponse = z.infer<typeof generateMusicResponse>;
export type MusicBufferResponse = z.infer<typeof musicBufferResponse>;

