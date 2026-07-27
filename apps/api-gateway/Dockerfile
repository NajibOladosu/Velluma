# Build stage
FROM node:22-alpine AS builder

WORKDIR /app

# Install dependencies (utilizing monorepo structure)
COPY package*.json ./
COPY turbo.json ./
COPY apps/api-gateway/package*.json ./apps/api-gateway/
COPY packages/ ./packages/

RUN npm install

# Build the shared workspace library first. Its dist/ is gitignored (absent in
# CI), so the gateway's tsc build can't resolve `supabase-lib` until it's built.
RUN npm run build --workspace=supabase-lib

# Copy source
COPY apps/api-gateway/ ./apps/api-gateway/

# Build the gateway
RUN npm run build --workspace=api-gateway

# Production stage
FROM node:22-alpine

RUN apk add --no-cache curl

WORKDIR /app

COPY --from=builder /app/apps/api-gateway/dist ./dist
COPY --from=builder /app/apps/api-gateway/package*.json ./
COPY --from=builder /app/node_modules ./node_modules
# node_modules/supabase-lib is a workspace symlink -> ../packages/supabase-lib,
# so the built library must be present for the require() to resolve at runtime.
COPY --from=builder /app/packages ./packages

EXPOSE 3001

CMD ["node", "dist/main"]
