import { z } from "zod";

// Query parameters schema for getting user's music
export const getUserMusicDto = z.object({
  page: z
    .string()
    .optional()
    .default("1")
    .transform((val) => parseInt(val, 10))
    .refine(
      (val) => !isNaN(val) && val >= 1,
      "Page must be a positive integer",
    ),

  limit: z
    .string()
    .optional()
    .default("10")
    .transform((val) => parseInt(val, 10))
    .refine(
      (val) => !isNaN(val) && val >= 1 && val <= 100,
      "Limit must be a positive integer between 1 and 100",
    ),
});

// TypeScript type for frontend use
export type GetUserMusicDto = z.infer<typeof getUserMusicDto>;
