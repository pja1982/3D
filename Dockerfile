# -------------------------------------------------------------
# 3D Print Cost & Quote Tracker - Local Self-Hosted Dockerfile
# -------------------------------------------------------------
FROM node:20-alpine AS builder

WORKDIR /app

# Copy package descriptors
COPY package*.json ./

# Install dependencies
RUN npm ci

# Copy application source code
COPY . .

# Build production static bundle
RUN npm run build

# Production runtime stage
FROM node:20-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3000
ENV DATA_DIR=/app/data

# Copy built bundle and server script
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/server.mjs ./server.mjs
COPY --from=builder /app/package.json ./package.json

# Create data directory for persistent local database volume
RUN mkdir -p /app/data

# Persistent volume for local quote and parts storage on host machine
VOLUME ["/app/data"]

EXPOSE 3000

CMD ["node", "server.mjs"]
