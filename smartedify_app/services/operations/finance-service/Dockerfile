# Multi-stage build for Finance Service
FROM node:18-alpine AS builder

WORKDIR /app

# Install curl for health checks
RUN apk add --no-cache curl

# Copy package files
COPY package*.json ./
COPY prisma ./prisma/

# Install dependencies
RUN npm ci && npm cache clean --force

# Generate Prisma client
RUN npx prisma generate

# Copy source code
COPY . .

# Build the application
RUN npm run build

# Production stage
FROM node:18-alpine AS production

WORKDIR /app

# Install dumb-init and curl for proper signal handling and health checks
RUN apk add --no-cache dumb-init curl

# Create non-root user
RUN addgroup -g 1001 -S nodejs
RUN adduser -S nestjs -u 1001

# Copy built application
COPY --from=builder --chown=nestjs:nodejs /app/dist ./dist
COPY --from=builder --chown=nestjs:nodejs /app/node_modules ./node_modules
COPY --from=builder --chown=nestjs:nodejs /app/prisma ./prisma
COPY --from=builder --chown=nestjs:nodejs /app/package*.json ./

# Create startup script
RUN echo '#!/bin/sh\necho "🚀 Starting Finance Service..."\necho "📊 Running database migrations..."\nnpx prisma migrate deploy || echo "⚠️ Migration failed, continuing..."\necho "🎯 Starting application..."\nnode dist/main' > start.sh && chmod +x start.sh

# Switch to non-root user
USER nestjs

# Expose port
EXPOSE 3007

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
  CMD curl -f http://localhost:3007/health || exit 1

# Start the application
ENTRYPOINT ["dumb-init", "--"]
CMD ["sh", "start.sh"]