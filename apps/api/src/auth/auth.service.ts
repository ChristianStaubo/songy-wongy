import { clerkClient } from '@clerk/express';
import { Injectable } from '@nestjs/common';
import { User } from '@clerk/backend';
import { PrismaService } from 'src/prisma/prisma.service';

@Injectable()
export class AuthService {
  constructor(private prisma: PrismaService) {}
  async getUsers(): Promise<User[]> {
    try {
      const response = await clerkClient.users.getUserList();
      return response.data;
    } catch (error) {
      console.error(error);
      throw new Error('Failed to fetch users');
    }
  }

  async getFirstUser() {
    const response = await clerkClient.users.getUser(
      'user_2r7OwwdzuZQX07C5I4xoO9jdiuR',
    );
    return response;
  }
}
