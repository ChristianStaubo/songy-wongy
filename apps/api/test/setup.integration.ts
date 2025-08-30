// Setup file for integration tests
// This file runs once before ALL integration test files

import { beforeAll, afterAll } from '@jest/globals';
import { Test, TestingModule } from '@nestjs/testing';
import { ValidationPipe } from '@nestjs/common';
import { AppModule } from '../src/app.module';
import { ZodValidationPipe, ZodSerializerInterceptor } from 'nestjs-zod';
import { HttpExceptionFilter } from '../src/common/filters/http-exception.filter';
import { PrismaService } from 'src/prisma/prisma.service';

// Global test setup - runs ONCE before all test files
beforeAll(async () => {
  console.log('🧪 Integration Test Environment Setup');
  console.log(`NODE_ENV: ${process.env.NODE_ENV}`);
  console.log(
    `DATABASE_URL: ${process.env.DATABASE_URL?.replace(/\/\/.*@/, '//***:***@')}`,
  );
  console.log(
    `REDIS_HOST: ${process.env.REDIS_HOST}:${process.env.REDIS_PORT}`,
  );
  console.log(`AWS S3 Endpoint: ${process.env.AWS_S3_ENDPOINT || 'default'}`);

  // Validate required environment variables
  const requiredEnvVars = [
    'DATABASE_URL',
    'CLERK_SECRET_KEY',
    'CLERK_PUBLISHABLE_KEY',
    'ELEVENLABS_API_KEY',
  ];

  const missingVars = requiredEnvVars.filter(
    (varName) => !process.env[varName],
  );

  if (missingVars.length > 0) {
    throw new Error(
      `Missing required environment variables for integration tests: ${missingVars.join(', ')}`,
    );
  }

  // Check AWS variables (optional - S3 tests will be skipped if missing)
  const awsVars = ['AWS_S3_REGION', 'AWS_ACCESS_KEY_ID', 'AWS_SECRET_ACCESS_KEY', 'AWS_S3_MUSIC_BUCKET'];
  const missingAwsVars = awsVars.filter((varName) => !process.env[varName]);

  if (missingAwsVars.length > 0) {
    console.log(`⚠️ Missing AWS credentials: ${missingAwsVars.join(', ')} - S3 tests will be skipped`);
  } else {
    console.log('✅ AWS credentials found - S3 tests will run');
  }

  // Create ONE shared app instance for all integration tests
  console.log('🚀 Creating shared NestJS app for all integration tests...');

  const moduleFixture: TestingModule = await Test.createTestingModule({
    imports: [AppModule],
  }).compile();

  global.testApp = moduleFixture.createNestApplication();

  // Apply the same global configuration as main.ts
  global.testApp.useGlobalPipes(new ZodValidationPipe());
  global.testApp.useGlobalInterceptors(
    new ZodSerializerInterceptor(new ZodValidationPipe()),
  );
  global.testApp.useGlobalFilters(new HttpExceptionFilter());

  await global.testApp.init();

  // Get shared Prisma service
  global.testPrisma = moduleFixture.get<PrismaService>(PrismaService);

  console.log('🔗 Connected to test database via Prisma');

  // Run database migrations for tests
  console.log('🔄 Running database migrations...');
  await global.testPrisma.$executeRawUnsafe(
    'CREATE EXTENSION IF NOT EXISTS "uuid-ossp"',
  );

  console.log('✅ Shared app instance ready for all integration tests');
});

// Global test cleanup - runs ONCE after all test files
afterAll(async () => {
  console.log('🧹 Cleaning up shared integration test resources...');

  // Clean up test data
  if (global.testPrisma) {
    try {
      // Clean up in reverse dependency order
      await global.testPrisma.music.deleteMany({});
      await global.testPrisma.user.deleteMany({});

      console.log('🗑️  Cleaned up all test data');
    } catch (error) {
      console.error('❌ Error cleaning up test data:', error);
    }

    await global.testPrisma.$disconnect();
  }

  // Close the shared app
  if (global.testApp) {
    await global.testApp.close();
    console.log('🔒 Closed shared app instance');
  }

  console.log('✅ Integration test cleanup completed');
});
