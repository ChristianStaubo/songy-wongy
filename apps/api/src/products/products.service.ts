import { Injectable } from '@nestjs/common';
import { CreateProduct, Product } from '@repo/types';

@Injectable()
export class ProductsService {
  private products: Product[] = [
    {
      id: '1',
      name: 'MacBook Pro M3',
      price: 1999,
      description: 'Powerful laptop with M3 chip, perfect for development',
      createdAt: '2025-01-01T00:00:00.000Z',
      meow: 'meow',
    },
  ];

  async createProduct(createProductData: CreateProduct): Promise<Product> {
    const product: Product = {
      id: Math.random().toString(36).substr(2, 9), // Simple ID generation
      createdAt: new Date().toISOString(), // ISO string format
      ...createProductData,
    };

    this.products.push(product);
    return product;
  }

  async getAllProducts(): Promise<Product[]> {
    return this.products;
  }

  async getProductById(id: string): Promise<Product | undefined> {
    return this.products.find((product) => product.id === id);
  }
}
