# Build stage
FROM node:20-alpine AS builder

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci

# Copy source code
COPY . .

# Build the frontend
RUN npm run build

# Production stage
FROM node:20-alpine AS production

WORKDIR /app

# Copy package files for production deps
COPY package*.json ./

# Install production dependencies only
RUN npm ci --only=production

# Copy built frontend
COPY --from=builder /app/dist ./dist

# Copy server source (we run with tsx in production too for simplicity)
COPY src/server ./src/server
COPY src/helpers ./src/helpers
COPY src/lib ./src/lib

# Copy migrations into the container
COPY migrations ./migrations

# Install tsx for running TypeScript
RUN npm install tsx

# Expose port
EXPOSE 3001

# Set environment
ENV NODE_ENV=production
ENV PORT=3001

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:3001/api/health || exit 1

# Start server with migrations
CMD ["sh", "-c", "npx tsx src/server/migrate.ts && npx tsx src/server/index.ts"]
