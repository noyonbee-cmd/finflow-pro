# ============================================================
# FinFlow Pro — Production Dockerfile
# Multi-stage build for Node.js 20 LTS
# ============================================================

# ─── Stage 1: Install Dependencies ──────────────────────────
FROM node:20-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json* ./
RUN npm ci --omit=dev

# ─── Stage 2: Production Image ──────────────────────────────
FROM node:20-alpine AS runner
WORKDIR /app

# Puppeteer system dependencies for PDF generation
RUN apk add --no-cache \
    chromium \
    nss \
    freetype \
    harfbuzz \
    ca-certificates \
    ttf-freefont \
    && rm -rf /var/cache/apk/*

# Set Puppeteer to use installed Chromium
ENV PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium-browser
ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true
ENV NODE_ENV=production

# Create non-root user for security
RUN addgroup -g 1001 -S finflow && \
    adduser -S finflow -u 1001

# Copy dependencies from Stage 1
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Create logs directory
RUN mkdir -p logs && chown -R finflow:finflow /app

USER finflow

EXPOSE 5000

HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD wget --no-verbose --tries=1 --spider http://localhost:5000/health || exit 1

CMD ["node", "src/app.js"]
