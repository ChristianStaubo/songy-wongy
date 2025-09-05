import * as globals from '@jest/globals';
import { PrismaService } from '../../src/prisma/prisma.service';
import { Decimal } from '@prisma/client/runtime/library';
// Import other services as needed
// import { SomeService } from '../../src/some/some.service';

globals.describe('ServiceName E2E Tests', () => {
  let prisma: PrismaService;
  // let someService: SomeService;

  // Test data tracking for cleanup
  const testData: {
    userIds: string[];
    musicIds: string[];
    // Add other data types as needed
  } = {
    userIds: [],
    musicIds: [],
  };

  globals.beforeAll(() => {
    // Arrange: Get services from shared test app
    prisma = global.testApp.get<PrismaService>(PrismaService);
    // someService = global.testApp.get<SomeService>(SomeService);
  });

  globals.afterAll(async () => {
    // Cleanup: Remove all test data
    try {
      // Clean up in reverse dependency order
      if (testData.musicIds.length > 0) {
        await prisma.music.deleteMany({
          where: { id: { in: testData.musicIds } },
        });
      }

      if (testData.userIds.length > 0) {
        await prisma.user.deleteMany({
          where: { id: { in: testData.userIds } },
        });
      }
    } catch (error) {
      console.warn('Cleanup error:', error.message);
    }
  });

  globals.describe('Feature Group', () => {
    globals.it('should perform expected behavior', async () => {
      // Arrange
      const testUserId = `test-user-${crypto.randomUUID()}`;
      const userData = {
        id: testUserId,
        clerkId: `clerk_${crypto.randomUUID()}`,
        email: 'test@example.com',
        name: 'Test User',
      };
      testData.userIds.push(testUserId); // Track for cleanup

      // Act
      const user = await prisma.user.create({ data: userData });
      const foundUser = await prisma.user.findUnique({
        where: { id: testUserId },
      });

      // Assert
      globals.expect(user.id).toBe(testUserId);
      globals.expect(user.email).toBe('test@example.com');
      globals.expect(foundUser).toBeTruthy();
      globals.expect(foundUser?.id).toBe(testUserId);
    });

    globals.it('should handle error scenarios', async () => {
      // Arrange
      const invalidUserId = 'non-existent-user';

      // Act & Assert
      await globals
        .expect(prisma.user.findUniqueOrThrow({ where: { id: invalidUserId } }))
        .rejects.toThrow();
    });
  });

  globals.describe('Complex Workflows', () => {
    globals.it('should handle multi-step operations', async () => {
      // Arrange
      const userId = `test-user-${crypto.randomUUID()}`;
      const musicId = `test-music-${crypto.randomUUID()}`;
      testData.userIds.push(userId);
      testData.musicIds.push(musicId);

      // Act - Step 1: Create user
      const user = await prisma.user.create({
        data: {
          id: userId,
          clerkId: `clerk_${crypto.randomUUID()}`,
          email: 'workflow@example.com',
          name: 'Workflow User',
        },
      });

      // Act - Step 2: Create transaction for music purchase
      const transaction = await prisma.transaction.create({
        data: {
          id: 'test-transaction-id',
          userId: user.id,
          type: 'PURCHASE',
          amount: new Decimal(10),
          description: 'Test transaction',
          status: 'COMPLETED',
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      });

      // Act - Step 3: Create music for user
      const music = await prisma.music.create({
        data: {
          id: musicId,
          name: 'Test Music',
          prompt: 'A test song',
          audioUrl: 'https://example.com/test.mp3',
          lengthMs: 30000,
          status: 'COMPLETED',
          userId: user.id,
          creditsUsed: 1,
          provider: 'ELEVENLABS',
          transactionId: transaction.id,
          metadata: { test: 'test' },
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      });

      // Act - Step 4: Query relationship
      const userWithMusic = await prisma.user.findUnique({
        where: { id: userId },
        include: { music: true },
      });

      // Assert
      globals.expect(user.id).toBe(userId);
      globals.expect(music.userId).toBe(userId);
      globals.expect(userWithMusic?.music).toHaveLength(1);
      globals.expect(userWithMusic?.music[0].id).toBe(musicId);
    });
  });
});
