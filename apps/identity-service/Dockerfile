# Build stage
FROM node:22-alpine AS builder

WORKDIR /app

# Install dependencies (utilizing monorepo structure)
COPY package*.json ./
COPY turbo.json ./
COPY apps/identity-service/package*.json ./apps/identity-service/
COPY packages/ ./packages/

RUN npm install

# Copy source
COPY apps/identity-service/ ./apps/identity-service/

# Build the service
RUN npm run build --workspace=identity-service

# Production stage
FROM node:22-alpine

RUN apk add --no-cache curl

WORKDIR /app

COPY --from=builder /app/apps/identity-service/dist ./dist
COPY --from=builder /app/apps/identity-service/package*.json ./
COPY --from=builder /app/node_modules ./node_modules

CMD ["node", "dist/main"]
