# Songy Wongy

A music generation platform built with a modern monorepo architecture for maximum development velocity and type safety.

## Architecture

This Turborepo monorepo shares types across all platforms to prevent API drift and ensure consistency:

### Apps

- `web`: Next.js frontend
- `api`: NestJS backend with Prisma, PostgreSQL, Redis, and BullMQ
- `mobile`: React Native

### Shared Packages

- `@repo/types`: Shared TypeScript types and Zod schemas across frontend, backend, and mobile
- `@repo/ui`: Reusable React component library
- `@repo/eslint-config`: ESLint configurations
- `@repo/typescript-config`: TypeScript configurations

- **Type Safety**: Shared Zod schemas ensure frontend, backend, and mobile never drift with differing types
- **Development Velocity**: Independent deployment pipelines and shared tooling
- **Code Reuse**: Frontend and mobile share React Query hooks and business logic
- **Unified State Management**: Consistent data fetching and caching across platforms

## Development

### Prerequisites

- Node.js 18+
- Docker & Docker Compose
- Yarn package manager

### Quick Start

```bash
# Install dependencies
yarn install

# Start all services (frontend + backend + database)
yarn run dev

# Clean shutdown and restart (runs docker-compose down)
yarn clean
yarn run dev
```

## Deployment

Each app has independent deployment pipelines for maximum velocity:

- **Frontend (`web`)**: Deployed to Vercel with automatic previews on PRs
- **Backend (`api`)**: Deployed to production infrastructure with Docker
- **Shared packages**: Automatically built and cached across deployments

### Git Hooks (Husky)

Pre-commit and pre-push hooks ensure code quality:

- **Pre-commit**: Formats staged files and runs linters
- **Pre-push**: Type checking (blocks) and tests (warns)

## Tech Stack

- **Frontend**: Next.js
- **Backend**: NestJS, Prisma, PostgreSQL, Redis, BullMQ
- **Mobile**: React Native
- **Shared**: TypeScript, Zod, ESLint, Prettier
- **Infrastructure**: Docker, GitHub Actions
- **Tools**: Turborepo, Husky

## Roadmap

### MVP 1 (Current)

- Frontend, mobile and backend with music generation APIs

### MVP 2

- Self-hosted music generation models with Modal for serverless GPU compute
- Cold start optimization for on-demand model inference
