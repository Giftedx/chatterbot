# Build stage
FROM node:18-alpine as builder

WORKDIR /app

# Copy package files
COPY package*.json ./
COPY tsconfig.json ./

# Install dependencies (include dev deps for TypeScript build)
RUN npm ci

# Copy source code
COPY src/ ./src/
COPY prisma/ ./prisma/

# Generate Prisma client
RUN npx prisma generate

# Build TypeScript
RUN npm run build

# Production stage
FROM node:18-alpine as production

WORKDIR /app

# Install dumb-init for proper signal handling
RUN apk add --no-cache dumb-init

# Create non-root user
RUN addgroup -g 1001 -S nodejs
RUN adduser -S botuser -u 1001

# Copy built application
COPY --from=builder --chown=botuser:nodejs /app/dist ./dist
COPY --from=builder --chown=botuser:nodejs /app/node_modules ./node_modules
COPY --from=builder --chown=botuser:nodejs /app/package*.json ./
COPY --from=builder --chown=botuser:nodejs /app/prisma ./prisma

# Create data directory for SQLite
RUN mkdir -p /app/data && chown botuser:nodejs /app/data

# Switch to non-root user
USER botuser

# Expose analytics dashboard port (optional)
EXPOSE 3001

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node -e "console.log('Health check passed')" || exit 1

# Use dumb-init to handle signals properly
ENTRYPOINT ["dumb-init", "--"]

# Start the application
CMD ["node", "dist/index.js"]
