# =========================================================================
# Stage 1: Build Stage (Compiles TypeScript & Generates Prisma Client)
# =========================================================================
FROM node:20-alpine AS builder

WORKDIR /app

# Install build dependencies for native modules (e.g., bcrypt)
RUN apk add --no-cache python3 make g++

# Copy package descriptors and Prisma schema
COPY package*.json ./
COPY prisma ./prisma/

# Install all dependencies and generate Prisma Client
RUN npm ci
RUN npx prisma generate

# Copy application source code
COPY tsconfig.json ./
COPY src ./src

# Compile TypeScript to JavaScript in /dist
RUN npm run build

# =========================================================================
# Stage 2: Production Lightweight Runner Stage
# =========================================================================
FROM node:20-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=5000

# Install dumb-init or bash if needed for signal forwarding
RUN apk add --no-cache openssl

# Copy package descriptors and prisma schema
COPY package*.json ./
COPY prisma ./prisma/

# Install only production dependencies
RUN npm ci --omit=dev && npm cache clean --force
RUN npx prisma generate

# Copy compiled code from builder stage
COPY --from=builder /app/dist ./dist

# Security hardening: Run as non-privileged system user
RUN addgroup -S esports && adduser -S apprunner -G esports
RUN chown -R apprunner:esports /app

USER apprunner

EXPOSE 5000

# Health check probe
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:5000/api/health || exit 1

# Execute Prisma schema sync and launch server
CMD ["sh", "-c", "npx prisma db push && node dist/server.js"]
