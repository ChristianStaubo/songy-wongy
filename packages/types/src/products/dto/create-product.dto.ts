import { z } from 'zod';

export const createProductDto = z.object({
  name: z.string().min(1, 'Name is required').max(100, 'Name must be less than 100 characters'),
  price: z.number().positive('Price must be positive'),
  description: z.string().min(1, 'Description is required').max(500, 'Description must be less than 500 characters'),
  meow: z.string().min(1, 'Meow is required').max(100, 'Meow must be less than 100 characters'),
});

export type CreateProduct = z.infer<typeof createProductDto>;
