# Multi-stage Dockerfile for both development and production

# Base stage with common setup
FROM node:18-alpine AS base
WORKDIR /app
RUN apk add --no-cache python3 make g++
COPY package*.json ./

# Development stage
FROM base AS development
RUN npm install
RUN npm install -g nodemon
COPY . .
EXPOSE 3000
CMD ["nodemon", "server.js"]

# Production dependencies stage
FROM base AS prod-deps
RUN npm ci --only=production

# Production stage
FROM node:18-alpine AS production
WORKDIR /app

# Copy production dependencies from prod-deps stage
COPY --from=prod-deps /app/node_modules ./node_modules

# Copy application code
COPY . .

# Create non-root user
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001 && \
    chown -R nodejs:nodejs /app

USER nodejs
EXPOSE 3000
CMD ["node", "server.js"]