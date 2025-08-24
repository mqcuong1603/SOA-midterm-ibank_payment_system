# Base stage with common setup
FROM node:18-alpine AS base
WORKDIR /app
RUN apk add --no-cache python3 make g++ libc6-compat
COPY package*.json ./

# Development stage
FROM base AS development
RUN npm ci
# Remove any existing bcrypt binaries and rebuild completely
RUN rm -rf node_modules/bcrypt
RUN npm install bcrypt --build-from-source
RUN npm install -g nodemon
COPY . .
EXPOSE 3000
CMD ["nodemon", "server.js"]

# Production dependencies stage
FROM base AS prod-deps
RUN npm ci --only=production --no-optional
# Remove any existing bcrypt binaries and rebuild completely
RUN rm -rf node_modules/bcrypt
RUN npm install bcrypt --build-from-source

# Production stage
FROM node:18-alpine AS production
WORKDIR /app

# Install runtime dependencies for bcrypt
RUN apk add --no-cache python3 make g++ libc6-compat

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