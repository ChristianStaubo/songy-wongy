import { z } from "zod";

export const signUpSchema = z.object({
  firstName: z.string().min(1, "First name is required"),
  lastName: z.string().min(1, "Last name is required"),
  email: z.string().email("Please enter a valid email address"),
  password: z
    .string()
    .min(8, "Password must be at least 8 characters")
    .regex(/[A-Z]/, "Password must contain at least one uppercase letter")
    .regex(/[a-z]/, "Password must contain at least one lowercase letter")
    .regex(/[0-9]/, "Password must contain at least one number"),
});

export const verifyEmailSchema = z.object({
  code: z.string().min(6, "Verification code must be at least 6 characters"),
});

export type SignUpFormData = z.infer<typeof signUpSchema>;
export type VerifyEmailFormData = z.infer<typeof verifyEmailSchema>;

