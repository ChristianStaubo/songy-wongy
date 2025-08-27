FROM node:20-alpine AS pruner

WORKDIR /app

RUN npm install -g turbo

COPY . .

RUN turbo prune --scope=api --docker

FROM node:20-alpine AS installer

WORKDIR /app

# Install deps using pruned manifests first (better cache behavior)
COPY --from=pruner /app/out/json/ .
COPY --from=pruner /app/out/yarn.lock ./yarn.lock
RUN yarn install --frozen-lockfile

# Now copy full pruned sources
COPY --from=pruner /app/out/full/ .
COPY --from=pruner /app/turbo.json ./turbo.json

FROM node:20-alpine AS builder

ARG TURBO_TEAM
ENV TURBO_TEAM=$TURBO_TEAM
ARG TURBO_TOKEN
ENV TURBO_TOKEN=$TURBO_TOKEN

WORKDIR /app

COPY --from=installer /app/ .
COPY --from=pruner /app/out/full/ .

# Build with increased memory limit
ENV NODE_OPTIONS="--max-old-space-size=4096"
RUN yarn turbo run build --filter=api

FROM node:20-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production

COPY --from=builder /app/ .

CMD ["node", "apps/api/dist/apps/api/src/main"]