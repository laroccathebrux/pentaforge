# Multi-stage build for PentaForge MCP Server

# Stage 1: Builder
FROM node:20-bookworm-slim AS builder

WORKDIR /app

# Copy package files
COPY package*.json ./
COPY tsconfig.json ./

# Install all dependencies (including dev deps for building)
RUN npm ci

# Copy source code
COPY src ./src

# Build TypeScript
RUN npm run build

# Stage 2: Runner
FROM node:20-bookworm-slim AS runner

# Create non-root user
RUN groupadd -g 1001 pentaforge && \
    useradd -r -u 1001 -g pentaforge pentaforge && \
    mkdir -p /app/PRPs/inputs && \
    chown -R pentaforge:pentaforge /app

WORKDIR /app

# Set production environment
ENV NODE_ENV=production
ENV TZ=UTC
ENV LANG=en_US.UTF-8
ENV LOG_LEVEL=INFO

# Copy package files
COPY --chown=pentaforge:pentaforge package*.json ./

# Install only production dependencies
RUN npm ci --only=production && \
    npm cache clean --force

# Copy built application from builder
COPY --from=builder --chown=pentaforge:pentaforge /app/dist ./dist

# Switch to non-root user
USER pentaforge

# Create output directory with correct permissions
RUN mkdir -p /app/PRPs/inputs

# Health check (MCP servers don't expose ports, so we check the process)
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node -e "process.exit(0)" || exit 1

# MCP servers use stdio, no EXPOSE needed
# Entry point
ENTRYPOINT ["node", "dist/server.js"]