import { z } from 'zod';
import { createProductDto } from '../dto/create-product.dto';

// Response schema - what the API returns
export const productResponse = createProductDto.extend({
  id: z.string(),
  createdAt: z.string().datetime(), // ISO string format for JSON compatibility
});

export type Product = z.infer<typeof productResponse>;
