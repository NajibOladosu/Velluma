# Build stage
FROM node:22-alpine AS builder

WORKDIR /app

# Install dependencies (utilizing monorepo structure)
COPY package*.json ./
COPY turbo.json ./
COPY apps/api-gateway/package*.json ./apps/api-gateway/
COPY packages/ ./packages/

RUN npm install

# Copy source
COPY apps/api-gateway/ ./apps/api-gateway/

# Build the gateway
RUN npm run build --workspace=api-gateway

# Production stage
FROM node:22-alpine

WORKDIR /app

COPY --from=builder /app/apps/api-gateway/dist ./dist
COPY --from=builder /app/apps/api-gateway/package*.json ./
COPY --from=builder /app/node_modules ./node_modules

EXPOSE 3001

CMD ["node", "dist/main"]
