# Songy Wongy

A music generation platform built with a modern monorepo architecture for maximum development velocity and type safety across frontend, backend, and mobile. Custom music generation model on modal for cheaper inference, with higher quality hosted models for speed and quality.

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

## Shared Validation Pattern

This project demonstrates a clean pattern for sharing Zod schemas and types across frontend and backend without framework coupling:

### Pattern Overview

```typescript
// packages/types/src/music/dto/generate-music.dto.ts
import { z } from "zod";

// Single source of truth - framework-agnostic Zod schema
export const generateMusicSchema = z.object({
  name: z.string().min(1).max(100),
  prompt: z.string().min(1).max(2000),
  lengthMs: z.number().int().min(10000).max(300000).optional(),
});

// TypeScript type for all consumers
export type GenerateMusicDto = z.infer<typeof generateMusicSchema>;
```

### Frontend Usage (React Hook Form)

```typescript
// apps/web/src/features/dashboard/components/song-creation-form.tsx
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { generateMusicSchema, GenerateMusicDto } from "@repo/types";

const form = useForm<GenerateMusicDto>({
  resolver: zodResolver(generateMusicSchema), // Client-side validation
});
```

### Backend Usage (NestJS Controller)

```typescript
// apps/api/src/music-generator/music-generator.controller.ts
import { generateMusicSchema } from '@repo/types';
import { createZodDto } from 'nestjs-zod';

// Create NestJS DTO class with Zod validation (backend only)
// Frontend uses the exported type and schema directly from @repo/types
class GenerateMusicDto extends createZodDto(generateMusicSchema) {}

@Post('generate')
async generateMusic(@Body() dto: GenerateMusicDto) {
  // Automatic server-side validation with proper error responses
}
```

### Benefits

- **🎯 Single Source of Truth**: One schema definition, used everywhere
- **🚫 No Framework Leakage**: Frontend never imports NestJS dependencies
- **✅ Full Type Safety**: TypeScript types work across all apps
- **🔄 Automatic Sync**: Schema changes automatically propagate everywhere
- **📝 Consistent Validation**: Same rules on client and server

## Development

### Prerequisites

- Node.js 18+
- Docker
- Yarn

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
