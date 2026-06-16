# Monorepo deps — cached until lockfiles change
FROM oven/bun:canary-alpine AS deps
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

FROM oven/bun:canary-alpine AS base
WORKDIR /app
RUN apk add --no-cache wget
COPY --from=deps /app/node_modules ./node_modules
COPY package.json bun.lock ./
COPY apps ./apps
COPY packages ./packages

# -------- Development --------
FROM base AS development
WORKDIR /app
ENV HOSTNAME=0.0.0.0
ENV PORT=3000
EXPOSE 3000
CMD ["sh", "-c", "cd apps/admin-frontend && exec bun run dev -- -p 3000 -H 0.0.0.0"]

# -------- Build --------
FROM base AS build
ENV PATH="/app/node_modules/.bin:${PATH}"
WORKDIR /app/apps/admin-frontend
ARG NEXT_PUBLIC_POCKETBASE_URL
ARG BASE_PATH
ENV NEXT_PUBLIC_POCKETBASE_URL=$NEXT_PUBLIC_POCKETBASE_URL
ENV BASE_PATH=$BASE_PATH
RUN bun run build

# -------- Production --------
FROM oven/bun:canary-alpine AS production
WORKDIR /app
ENV PATH="/app/node_modules/.bin:${PATH}"
RUN apk add --no-cache wget
COPY --from=deps /app/node_modules ./node_modules
COPY --from=build /app/apps/admin-frontend/.next ./apps/admin-frontend/.next
COPY --from=build /app/apps/admin-frontend/public ./apps/admin-frontend/public
COPY apps/admin-frontend/package.json ./apps/admin-frontend/
COPY package.json bun.lock ./
COPY packages/ui ./packages/ui
WORKDIR /app/apps/admin-frontend
ENV HOSTNAME=0.0.0.0
ENV PORT=3000
EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=3 \
  CMD wget -q -O- http://localhost:3000/ || exit 1
CMD ["bun", "run", "start", "--", "-p", "3000", "-H", "0.0.0.0"]

FROM production
