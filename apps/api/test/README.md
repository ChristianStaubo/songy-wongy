# Testing Guide

This guide covers both unit tests and integration tests for the Songy Wongy API.

## Test Types

### Unit Tests

- **Location**: `src/**/*.spec.ts`
- **Command**: `yarn test`
- **Purpose**: Fast, isolated tests that mock dependencies
- **What they test**: Individual service methods, validation logic, error handling

### Integration Tests

- **Location**: `test/**/*.integration-spec.ts`
- **Command**: `yarn test:integration` (automated) or `yarn test:e2e` (manual)
- **Purpose**: End-to-end tests against real services
- **What they test**: Complete workflows with real PostgreSQL, Redis, and AWS S3

## Quick Start

### Run Unit Tests (Fast)

```bash
yarn test
```

### Run Integration Tests (Complete Setup)

```bash
yarn test:integration
```

The integration script handles everything automatically:

- Starts test services (PostgreSQL, Redis)
- Waits for services to be healthy
- Runs database migrations
- Executes all integration tests
- Cleans up services afterward

## Integration Test Setup

### 1. Start Test Services

Start the test PostgreSQL and Redis services:

```bash
docker-compose -f docker-compose.test.yml up -d
```

### 2. Environment Variables

Create a `.env.test` file in the project root with the following variables:

```env
NODE_ENV=test
PORT=8001

# Database (Test PostgreSQL from docker-compose.test.yml)
DATABASE_URL="postgresql://testuser:testpassword@localhost:5433/songy_wongy_test"

# Clerk Authentication (Use test keys)
CLERK_SECRET_KEY=sk_test_your_test_secret_key_here
CLERK_PUBLISHABLE_KEY=pk_test_your_test_publishable_key_here
CLERK_WEBHOOK_SIGNING_SECRET=whsec_test_webhook_signing_secret_here

# ElevenLabs API (Use test API key or sandbox)
ELEVENLABS_API_KEY=your_test_elevenlabs_api_key_here

# AWS S3 Configuration (REAL S3 for integration tests)
# Use a dedicated test bucket to avoid conflicts with production
AWS_S3_REGION=us-east-1
AWS_ACCESS_KEY_ID=your_aws_access_key_id_here
AWS_SECRET_ACCESS_KEY=your_aws_secret_access_key_here
AWS_S3_MUSIC_BUCKET=songy-wongy-test-music

# Redis (Test Redis from docker-compose.test.yml)
REDIS_HOST=localhost
REDIS_PORT=6380
```

### 3. Database Setup

Run Prisma migrations on the test database:

```bash
# Set the test database URL
export DATABASE_URL="postgresql://testuser:testpassword@localhost:5433/songy_wongy_test"

# Run migrations
npx prisma migrate deploy

# Generate Prisma client
npx prisma generate
```

### 4. AWS S3 Test Bucket

Create a dedicated S3 bucket for testing:

```bash
aws s3 mb s3://songy-wongy-test-music --region us-east-1
```

**Important:** Use a separate test bucket to avoid interfering with production data.

## Running Tests

### Run All Integration Tests

```bash
npm run test:e2e
```

### Run Specific Test Files

```bash
# Basic app tests
npm run test:e2e -- --testNamePattern="App Integration Tests"

# S3 service tests
npm run test:e2e -- --testNamePattern="S3Service Integration Tests"
```

### Run Tests with Verbose Output

```bash
npm run test:e2e -- --verbose
```

## Test Structure

- `setup.integration.ts` - Global test setup and cleanup
- `app.integration-spec.ts` - Basic app and database connectivity tests
- `s3.integration-spec.ts` - Comprehensive S3 service tests

## Cleanup

The script will tear down the docker volumes, cleaning up any resources
