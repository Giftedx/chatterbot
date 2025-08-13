# ---- Base build stage ----
FROM node:20-alpine AS builder
WORKDIR /app

# Faster builds
RUN apk add --no-cache libc6-compat openssl python3 make g++

# Set a default DATABASE_URL during build so prisma generate does not complain
ENV DATABASE_URL=file:./prisma/dev.db

# Install deps
COPY package*.json ./
RUN --mount=type=cache,target=/root/.npm npm ci

# Copy source
COPY tsconfig.json ./
COPY prisma ./prisma
COPY src ./src

# Generate Prisma client & build
RUN npx prisma generate
RUN npm run build

# Prune dev deps for smaller runtime, but keep @prisma/client in deps
RUN npm prune --omit=dev

# ---- Runtime stage ----
FROM node:20-alpine AS runtime
WORKDIR /app

# Install wget for healthchecks inside container and tini for proper signal handling
RUN apk add --no-cache wget tini

# Create non-root user and data dir
RUN addgroup -S app && adduser -S app -G app && \
    mkdir -p /data && chown -R app:app /data

# Default envs
ENV NODE_ENV=production \
    HEALTH_CHECK_PORT=3000 \
    DATABASE_URL=file:/data/dev.db

# Copy built app and runtime deps
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/package*.json ./

# Add entrypoint
COPY docker/entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh

# Drop privileges
USER app

# Expose health and optional analytics ports
EXPOSE 3000 3001

# Image-level healthcheck (works without compose)
HEALTHCHECK --interval=30s --timeout=5s --retries=3 CMD wget -qO- http://localhost:3000/health || exit 1

# Use tini as PID 1 for signal handling
ENTRYPOINT ["/sbin/tini", "-g", "--", "/entrypoint.sh"]
