import { z } from "zod";

// Schema for creating a new user
export const createUserDto = z.object({
  clerkId: z.string().min(1).describe("Clerk user ID from webhook"),
  email: z.string().email().nullable().describe("User email address"),
  name: z.string().nullable().describe("User full name"),
});

// TypeScript type
export type CreateUserDto = z.infer<typeof createUserDto>;
