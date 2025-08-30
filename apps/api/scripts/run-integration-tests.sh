#!/bin/bash

# Integration Test Runner Script
# This script handles the complete integration test workflow:
# 1. Starts test services (PostgreSQL, Redis)
# 2. Waits for services to be healthy
# 3. Runs database migrations
# 4. Runs integration tests
# 5. Cleans up services

set -e  # Exit on any error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Function to cleanup on exit
cleanup() {
    print_status "Cleaning up test services..."
    docker-compose -f docker-compose.test.yml down -v --remove-orphans 2>/dev/null || true
    print_success "Cleanup completed"
}

# Set trap to cleanup on script exit
trap cleanup EXIT

# Check if required files exist
if [ ! -f "docker-compose.test.yml" ]; then
    print_error "docker-compose.test.yml not found!"
    exit 1
fi

if [ ! -f "test/jest-e2e.json" ]; then
    print_error "test/jest-e2e.json not found!"
    exit 1
fi

print_status "🧪 Starting Integration Test Suite"

# Set hardcoded test environment variables for local services
print_status "Setting up test environment..."
export NODE_ENV=test
export DATABASE_URL="postgresql://testuser:testpassword@localhost:5433/songy_wongy_test"
export REDIS_HOST=localhost
export REDIS_PORT=6380

# Set test keys for Clerk (these can be dummy values for most tests)
export CLERK_SECRET_KEY="sk_test_dummy_key_for_integration_tests"
export CLERK_PUBLISHABLE_KEY="pk_test_dummy_key_for_integration_tests"
export CLERK_WEBHOOK_SIGNING_SECRET="whsec_test_dummy_webhook_secret"

# Set dummy ElevenLabs key (tests will mock the API calls)
export ELEVENLABS_API_KEY="dummy_elevenlabs_key_for_tests"

# Load AWS credentials from .env.test if it exists
if [ -f ".env.test" ]; then
    print_status "Loading AWS credentials from .env.test..."
    # Only load AWS-related variables
    export AWS_S3_REGION=$(grep '^AWS_S3_REGION=' .env.test | cut -d '=' -f2)
    export AWS_ACCESS_KEY_ID=$(grep '^AWS_ACCESS_KEY_ID=' .env.test | cut -d '=' -f2)
    export AWS_SECRET_ACCESS_KEY=$(grep '^AWS_SECRET_ACCESS_KEY=' .env.test | cut -d '=' -f2)
    export AWS_S3_MUSIC_BUCKET=$(grep '^AWS_S3_MUSIC_BUCKET=' .env.test | cut -d '=' -f2)
else
    print_warning ".env.test file not found!"
    print_warning "AWS S3 tests will be skipped. Create .env.test with AWS credentials to enable S3 testing."
    print_warning "Required in .env.test:"
    print_warning "  AWS_S3_REGION=us-east-1"
    print_warning "  AWS_ACCESS_KEY_ID=your_access_key"
    print_warning "  AWS_SECRET_ACCESS_KEY=your_secret_key"
    print_warning "  AWS_S3_MUSIC_BUCKET=your-test-bucket"
fi

# Validate required AWS environment variables (only if .env.test exists)
if [ -f ".env.test" ]; then
    required_aws_vars=(
        "AWS_S3_REGION"
        "AWS_ACCESS_KEY_ID"
        "AWS_SECRET_ACCESS_KEY"
        "AWS_S3_MUSIC_BUCKET"
    )

    for var in "${required_aws_vars[@]}"; do
        if [ -z "${!var}" ]; then
            print_error "Required AWS environment variable $var is not set in .env.test!"
            exit 1
        fi
    done

    print_success "AWS credentials loaded successfully"
else
    print_warning "Skipping AWS credential validation (no .env.test file)"
fi

print_success "Test environment configured"

# Start test services
print_status "🚀 Starting test services (PostgreSQL, Redis)..."
docker-compose -f docker-compose.test.yml up -d

# Wait for services to be healthy
print_status "⏳ Waiting for services to be healthy..."

# Wait for PostgreSQL
print_status "Waiting for PostgreSQL..."
timeout=60
counter=0
while [ $counter -lt $timeout ]; do
    if docker-compose -f docker-compose.test.yml exec -T test-postgres pg_isready -U testuser -d songy_wongy_test >/dev/null 2>&1; then
        print_success "PostgreSQL is ready!"
        break
    fi
    counter=$((counter + 1))
    sleep 1
done

if [ $counter -eq $timeout ]; then
    print_error "PostgreSQL failed to start within $timeout seconds"
    exit 1
fi

# Wait for Redis
print_status "Waiting for Redis..."
counter=0
while [ $counter -lt $timeout ]; do
    if docker-compose -f docker-compose.test.yml exec -T test-redis redis-cli ping >/dev/null 2>&1; then
        print_success "Redis is ready!"
        break
    fi
    counter=$((counter + 1))
    sleep 1
done

if [ $counter -eq $timeout ]; then
    print_error "Redis failed to start within $timeout seconds"
    exit 1
fi

# Run database migrations
print_status "🗃️  Running database migrations..."
npx prisma migrate deploy

if [ $? -eq 0 ]; then
    print_success "Database migrations completed successfully"
else
    print_error "Database migrations failed!"
    exit 1
fi

# Generate Prisma client
print_status "🔧 Generating Prisma client..."
npx prisma generate

if [ $? -eq 0 ]; then
    print_success "Prisma client generated successfully"
else
    print_error "Prisma client generation failed!"
    exit 1
fi

# Run integration tests
print_status "🧪 Running integration tests..."

# Run tests with proper environment
NODE_ENV=test npm run test:e2e

if [ $? -eq 0 ]; then
    print_success "🎉 All integration tests passed!"
else
    print_error "❌ Integration tests failed!"
    exit 1
fi

print_success "✅ Integration test suite completed successfully!"
