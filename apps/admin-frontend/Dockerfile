# Monorepo deps — cached until lockfiles change
FROM oven/bun:1.3.13-alpine AS deps
WORKDIR /app
COPY package.json bun.lock ./
COPY apps/admin-frontend/package.json ./apps/admin-frontend/
COPY apps/public-frontend/package.json ./apps/public-frontend/
COPY packages/ui/package.json ./packages/ui/
COPY packages/eslint-config/package.json ./packages/eslint-config/
COPY packages/typescript-config/package.json ./packages/typescript-config/
COPY packages/pocketbase/package.json ./packages/pocketbase/
RUN --mount=type=cache,target=/root/.bun/install/cache \
    bun install --frozen-lockfile

FROM oven/bun:1.3.13-alpine AS base
WORKDIR /app
RUN apk add --no-cache wget
COPY --from=deps /app/node_modules ./node_modules
COPY package.json bun.lock ./
COPY apps ./apps
COPY packages ./packages

# -------- Development (source + node_modules from compose volumes) --------
FROM oven/bun:1.3.13-alpine AS development
RUN apk add --no-cache wget
WORKDIR /app
ENV HOSTNAME=0.0.0.0
ENV PORT=3000
EXPOSE 3000
CMD ["sh", "-c", "cd apps/admin-frontend && exec bun run dev -- -p 3000 -H 0.0.0.0"]

# -------- Build --------
FROM base AS build
WORKDIR /app
ARG NEXT_PUBLIC_POCKETBASE_URL
ARG BASE_PATH
ENV NEXT_PUBLIC_POCKETBASE_URL=$NEXT_PUBLIC_POCKETBASE_URL
ENV BASE_PATH=$BASE_PATH
RUN bun install --frozen-lockfile
RUN mkdir -p apps/admin-frontend/public
RUN bun run --cwd apps/admin-frontend build

# -------- Production (Next.js standalone — minimal traced runtime) --------
FROM node:22-alpine AS production
RUN apk add --no-cache wget
WORKDIR /app
ENV NODE_ENV=production
ENV BASE_PATH=/admin
ENV HOSTNAME=0.0.0.0
ENV PORT=3000
COPY --from=build /app/apps/admin-frontend/.next/standalone ./
COPY --from=build /app/apps/admin-frontend/.next/static ./apps/admin-frontend/.next/static
COPY --from=build /app/apps/admin-frontend/public ./apps/admin-frontend/public
WORKDIR /app/apps/admin-frontend
EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=5s --start-period=40s --retries=3 \
  CMD wget -q -O- http://localhost:3000/admin || exit 1
CMD ["node", "server.js"]

FROM production
