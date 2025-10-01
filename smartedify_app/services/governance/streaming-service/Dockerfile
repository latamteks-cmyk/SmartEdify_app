# Multi-stage build for SmartEdify Streaming Service
FROM node:18-alpine AS base

# Install security updates and required packages
RUN apk update && apk upgrade && \
    apk add --no-cache dumb-init curl && \
    rm -rf /var/cache/apk/*

# Create app user for security
RUN addgroup -g 1001 -S nodejs && \
    adduser -S streaming -u 1001

WORKDIR /app

# Copy package files
COPY package*.json ./
COPY tsconfig*.json ./

# Development stage
FROM base AS development
ENV NODE_ENV=development
RUN npm ci --include=dev
COPY . .
RUN chown -R streaming:nodejs /app
USER streaming
EXPOSE 3014
CMD ["npm", "run", "start:dev"]

# Build stage
FROM base AS build
ENV NODE_ENV=production
RUN npm ci --only=production && npm cache clean --force
COPY . .
RUN npm run build && \
    rm -rf src/ test/ node_modules/ && \
    npm ci --only=production --ignore-scripts

# Production stage
FROM node:18-alpine AS production

# Install security updates
RUN apk update && apk upgrade && \
    apk add --no-cache dumb-init curl && \
    rm -rf /var/cache/apk/*

# Create app user
RUN addgroup -g 1001 -S nodejs && \
    adduser -S streaming -u 1001

WORKDIR /app

# Copy built application
COPY --from=build --chown=streaming:nodejs /app/dist ./dist
COPY --from=build --chown=streaming:nodejs /app/node_modules ./node_modules
COPY --from=build --chown=streaming:nodejs /app/package*.json ./

# Security: Use non-root user
USER streaming

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:3014/api/v1/health/live || exit 1

# Expose port
EXPOSE 3014

# Use dumb-init to handle signals properly
ENTRYPOINT ["dumb-init", "--"]
CMD ["node", "dist/main.js"]