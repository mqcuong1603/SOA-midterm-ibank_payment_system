###############################################
# Base image (Debian slim) to avoid musl issues
# Adds build tools once so native modules compile
###############################################
FROM node:18-bullseye-slim AS base
WORKDIR /app
ENV TZ=UTC
RUN apt-get update \
    && apt-get install -y --no-install-recommends python3 build-essential \
    && rm -rf /var/lib/apt/lists/*
COPY package*.json ./

###############################################
# Development dependencies (includes dev deps)
###############################################
FROM base AS deps-dev
ENV NODE_ENV=development
RUN npm ci

###############################################
# Production dependencies (omit dev deps)
###############################################
FROM base AS deps-prod
ENV NODE_ENV=production
RUN npm ci --omit=dev

###############################################
# Development runtime stage
###############################################
FROM node:18-bullseye-slim AS development
WORKDIR /app
ENV NODE_ENV=development
# Copy node_modules from deps-dev (native modules already built for this image)
COPY --from=deps-dev /app/node_modules ./node_modules
COPY . .
EXPOSE 3000
# Use npx to run local nodemon (present in dev deps)
CMD ["npx", "nodemon", "server.js"]

###############################################
# Production runtime stage
###############################################
FROM node:18-bullseye-slim AS production
WORKDIR /app
ENV NODE_ENV=production
COPY --from=deps-prod /app/node_modules ./node_modules
COPY . .
EXPOSE 3000
CMD ["node", "server.js"]