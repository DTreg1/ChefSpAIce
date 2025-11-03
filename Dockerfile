# Multi-stage Dockerfile for Node.js application

# Stage 1: Base image with dependencies
FROM node:25-alpine AS base
WORKDIR /app

# Install system dependencies (required for some npm packages)
RUN apk add --no-cache python3 make g++ && \
    ln -sf python3 /usr/bin/python

# Copy package files
COPY package*.json ./

# Stage 2: Development stage
FROM base AS development
# Install all dependencies (including devDependencies for development)
RUN npm ci

# Copy all project files
COPY . .

# Expose port for development server
EXPOSE 5000

# Development command (hot reloading enabled)
CMD ["npm", "run", "dev"]

# Stage 3: Build stage for production
FROM base AS builder
# Install all dependencies (needed for building)
RUN npm ci

# Copy source code
COPY . .

# Build the application
RUN npm run build

# Stage 4: Production stage
FROM node:25-alpine AS production
WORKDIR /app

# Install only production dependencies
COPY package*.json ./
RUN npm ci --only=production && npm cache clean --force

# Copy built application from builder stage
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/public ./public

# Copy any other necessary files
COPY --from=builder /app/shared ./shared

# Create non-root user for security
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001

# Switch to non-root user
USER nodejs

# Expose port for production server
EXPOSE 5000

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node -e "require('http').get('http://localhost:5000/health', (res) => { process.exit(res.statusCode === 200 ? 0 : 1); })" || exit 1

# Production command
CMD ["npm", "run", "start"]