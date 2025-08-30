# E2E Test Template

Use this template for creating new E2E tests with clean Arrange-Act-Assert pattern.

## Template Code

```typescript
import { describe, it, expect, beforeAll, afterAll } from '@jest/globals';
import { PrismaService } from '../../src/prisma/prisma.service';
// Import other services as needed
// import { SomeService } from '../../src/some/some.service';

describe('ServiceName E2E Tests', () => {
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

  beforeAll(() => {
    // Arrange: Get services from shared test app
    prisma = global.testApp.get<PrismaService>(PrismaService);
    // someService = global.testApp.get<SomeService>(SomeService);
  });

  afterAll(async () => {
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

  describe('Feature Group', () => {
    it('should perform expected behavior', async () => {
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
      expect(user.id).toBe(testUserId);
      expect(user.email).toBe('test@example.com');
      expect(foundUser).toBeTruthy();
      expect(foundUser?.id).toBe(testUserId);
    });

    it('should handle error scenarios', async () => {
      // Arrange
      const invalidUserId = 'non-existent-user';

      // Act & Assert
      await expect(
        prisma.user.findUniqueOrThrow({ where: { id: invalidUserId } }),
      ).rejects.toThrow();
    });
  });

  describe('Complex Workflows', () => {
    it('should handle multi-step operations', async () => {
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

      // Act - Step 2: Create music for user
      const music = await prisma.music.create({
        data: {
          id: musicId,
          name: 'Test Music',
          prompt: 'A test song',
          audioUrl: 'https://example.com/test.mp3',
          lengthMs: 30000,
          status: 'COMPLETED',
          userId: user.id,
        },
      });

      // Act - Step 3: Query relationship
      const userWithMusic = await prisma.user.findUnique({
        where: { id: userId },
        include: { music: true },
      });

      // Assert
      expect(user.id).toBe(userId);
      expect(music.userId).toBe(userId);
      expect(userWithMusic?.music).toHaveLength(1);
      expect(userWithMusic?.music[0].id).toBe(musicId);
    });
  });
});
```

## Key Patterns

### **1. Arrange-Act-Assert Structure**

```typescript
it('should do something', async () => {
  // Arrange - Set up test data and conditions
  const testData = {
    /* setup */
  };

  // Act - Perform the action being tested
  const result = await service.doSomething(testData);

  // Assert - Verify the results
  expect(result).toBe(expected);
});
```

### **2. Test Data Tracking**

```typescript
const testData = {
  userIds: [],
  musicIds: [],
};

// In tests: testData.userIds.push(newUserId);
// In afterAll: cleanup using the tracked IDs
```

### **3. Service Injection**

```typescript
let prisma: PrismaService;
let someService: SomeService;

beforeAll(() => {
  prisma = global.testApp.get<PrismaService>(PrismaService);
  someService = global.testApp.get<SomeService>(SomeService);
});
```

### **4. Error Testing**

```typescript
// For expected errors
await expect(service.methodThatShouldFail(invalidData)).rejects.toThrow();
```
