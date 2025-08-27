import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

export interface CreateUserDto {
  clerkId: string;
  email?: string;
  name?: string;
}

@Injectable()
export class UsersService {
  private readonly logger = new Logger(UsersService.name);

  constructor(private readonly prisma: PrismaService) {}

  async createUser(data: CreateUserDto) {
    this.logger.log(`Creating user with Clerk ID: ${data.clerkId}`);

    try {
      const user = await this.prisma.user.create({
        data: {
          clerkId: data.clerkId,
          email: data.email,
          name: data.name,
        },
      });

      this.logger.log(`Successfully created user with ID: ${user.id}`);
      return user;
    } catch (error) {
      this.logger.error(
        `Failed to create user with Clerk ID: ${data.clerkId}`,
        error,
      );
      throw error;
    }
  }

  async findUserByClerkId(clerkId: string) {
    this.logger.log(`Finding user with Clerk ID: ${clerkId}`);

    try {
      const user = await this.prisma.user.findUnique({
        where: { clerkId },
      });

      if (user) {
        this.logger.log(`Found user with ID: ${user.id}`);
      } else {
        this.logger.log(`No user found with Clerk ID: ${clerkId}`);
      }

      return user;
    } catch (error) {
      this.logger.error(`Failed to find user with Clerk ID: ${clerkId}`, error);
      throw error;
    }
  }

  async findUserById(id: string) {
    this.logger.log(`Finding user with ID: ${id}`);

    try {
      const user = await this.prisma.user.findUnique({
        where: { id },
      });

      if (user) {
        this.logger.log(`Found user with Clerk ID: ${user.clerkId}`);
      } else {
        this.logger.log(`No user found with ID: ${id}`);
      }

      return user;
    } catch (error) {
      this.logger.error(`Failed to find user with ID: ${id}`, error);
      throw error;
    }
  }
}
