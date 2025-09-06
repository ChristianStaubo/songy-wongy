import { z } from "zod";

// Zod schema for music generation request
export const generateMusicSchema = z.object({
  name: z
    .string()
    .min(1, "Name is required")
    .max(100, "Name must be less than 100 characters")
    .describe("Name for the generated music track"),

  prompt: z
    .string()
    .min(1, "Prompt is required")
    .max(2000, "Prompt must be less than 2000 characters")
    .describe("Text prompt describing the music to generate"),

  lengthMs: z
    .number()
    .int()
    .min(10000, "Length must be at least 10000ms (10 seconds)")
    .max(300000, "Length must be at most 300000ms (5 minutes)")
    .optional()
    .describe("Length of the generated music in milliseconds"),

  outputFormat: z
    .enum([
      "mp3_44100_128",
      "mp3_44100_192",
      "mp3_44100_64",
      "mp3_22050_32",
      "pcm_16000",
      "pcm_22050",
      "pcm_24000",
      "pcm_44100",
      "ulaw_8000",
    ])
    .default("mp3_44100_128")
    .optional()
    .describe("Output format of the generated audio"),

  modelId: z
    .enum(["music_v1"])
    .default("music_v1")
    .optional()
    .describe("The model to use for music generation"),
});

// TypeScript type for music generation request
export type GenerateMusicDto = z.infer<typeof generateMusicSchema>;
