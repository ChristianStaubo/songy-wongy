import { PrismaService } from '../../src/prisma/prisma.service';
import { describe, it, expect, beforeAll } from '@jest/globals';

describe('App Integration Tests - Basic Setup', () => {
  let prisma: PrismaService;

  beforeAll(() => {
    // Get PrismaService directly from the test app - much cleaner!
    prisma = global.testApp.get<PrismaService>(PrismaService);
  });

  describe('Basic Health Check', () => {
    it('should verify database connection is working', async () => {
      // Test database connection by running a simple query
      const result = await prisma.$queryRaw`SELECT 1 as test`;
      expect(result).toBeTruthy();
      expect(Array.isArray(result)).toBe(true);
      expect(result[0]).toEqual({ test: 1 });

      console.log('✅ Database connection verified via Prisma');
    });

    it('should verify app instance is properly initialized', () => {
      expect(global.testApp).toBeDefined();
      expect(global.testApp.getHttpServer()).toBeDefined();
      expect(prisma).toBeDefined();

      console.log('✅ App instance and Prisma service verified');
    });

    it('should be able to create and clean up test data', async () => {
      // Create a test user - clean and type-safe!
      const testUser = await prisma.user.create({
        data: {
          id: 'test-user-basic-check',
          clerkId: 'clerk_test_user_123',
          email: 'test@example.com',
          name: 'Test User',
        },
      });

      expect(testUser.id).toBe('test-user-basic-check');
      expect(testUser.email).toBe('test@example.com');
      expect(testUser.clerkId).toBe('clerk_test_user_123');

      // Clean up the test user
      await prisma.user.delete({
        where: { id: 'test-user-basic-check' },
      });

      console.log('✅ Database CRUD operations working correctly');
    });
  });

  describe('Environment Configuration', () => {
    it('should have all required environment variables', () => {
      const requiredEnvVars = [
        'DATABASE_URL',
        'CLERK_SECRET_KEY',
        'ELEVENLABS_API_KEY',
        'AWS_S3_REGION',
        'AWS_ACCESS_KEY_ID',
        'AWS_SECRET_ACCESS_KEY',
        'AWS_S3_MUSIC_BUCKET',
      ];

      for (const envVar of requiredEnvVars) {
        expect(process.env[envVar]).toBeTruthy();
      }

      console.log('✅ All required environment variables are set');
    });

    it('should be running in test environment', () => {
      expect(process.env.NODE_ENV).toBe('test');
      console.log('✅ Running in test environment');
    });
  });
});
