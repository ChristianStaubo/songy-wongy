import {
  Injectable,
  Logger,
  InternalServerErrorException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateUserDto } from '@repo/types';
import { Prisma } from '@prisma/client';

@Injectable()
export class UsersService {
  private readonly logger = new Logger(UsersService.name);

  constructor(private prismaService: PrismaService) {}

  /**
   * Get user by Clerk ID - reusable across all services
   * @param clerkId - Clerk user ID from JWT token
   * @returns User record from database
   * @throws Error if user not found
   */
  async getUserByClerkId(clerkId: string) {
    const user = await this.prismaService.user.findUnique({
      where: { clerkId },
    });

    if (!user) {
      throw new Error(`User not found for clerkId: ${clerkId}`);
    }

    return user;
  }

  /**
   * Get user ID by Clerk ID - convenience method for when you only need the ID
   * @param clerkId - Clerk user ID from JWT token
   * @returns Database user ID
   * @throws Error if user not found
   */
  async getUserIdByClerkId(clerkId: string): Promise<string> {
    const user = await this.getUserByClerkId(clerkId);
    return user.id;
  }

  /**
   * Find user by Clerk ID - returns null if not found (used by webhooks)
   * @param clerkId - Clerk user ID from JWT token
   * @returns User record or null if not found
   */
  async findUserByClerkId(clerkId: string) {
    return await this.prismaService.user.findUnique({
      where: { clerkId },
    });
  }

  /**
   * Create a new user in the database
   * @param data - User creation data from Clerk webhook
   * @returns Created user record
   * @throws BadRequestException for Prisma/database errors
   * @throws InternalServerErrorException for unexpected errors
   */
  async createUser(data: CreateUserDto) {
    this.logger.log(
      `Creating user with Clerk ID: ${data.clerkId}, email: ${data.email}, name: ${data.name}`,
    );

    try {
      const user = await this.prismaService.user.create({
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
        { error: error.message },
      );

      // If it's a Prisma error, it's likely a client issue (bad data, constraints)
      if (
        error instanceof Prisma.PrismaClientKnownRequestError ||
        error instanceof Prisma.PrismaClientValidationError
      ) {
        throw new BadRequestException('Failed to create user');
      }

      // Everything else is a server error
      throw new InternalServerErrorException('Internal server error');
    }
  }
}
