import { z } from 'zod';

// Zod schema for music generation request
export const generateMusicDto = z.object({
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

// TypeScript type for music generation request
export type GenerateMusicDto = z.infer<typeof generateMusicDto>;

