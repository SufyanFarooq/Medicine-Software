# Universal Business Management System Dockerfile
# Multi-stage build for optimized production image

# Stage 1: Build stage
FROM node:18-alpine AS builder

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci --only=production

# Copy source code
COPY . .

# Build the application
RUN npm run build

# Stage 2: Production stage
FROM node:18-alpine AS production

# Install dumb-init for proper signal handling
RUN apk add --no-cache dumb-init

# Create app user for security
RUN addgroup -g 1001 -S nodejs
RUN adduser -S ubms -u 1001

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install only production dependencies
RUN npm ci --only=production && npm cache clean --force

# Copy built application from builder stage
COPY --from=builder --chown=ubms:nodejs /app/.next ./.next
COPY --from=builder --chown=ubms:nodejs /app/public ./public

# Copy necessary files
COPY --chown=ubms:nodejs next.config.js ./
COPY --chown=ubms:nodejs tailwind.config.js ./
COPY --chown=ubms:nodejs postcss.config.js ./

# Create necessary directories
RUN mkdir -p /app/logs /app/uploads /app/backups

# Set ownership
RUN chown -R ubms:nodejs /app

# Switch to non-root user
USER ubms

# Expose port
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3000/api/health', (res) => { process.exit(res.statusCode === 200 ? 0 : 1) })" || exit 1

# Start the application with dumb-init
ENTRYPOINT ["dumb-init", "--"]
CMD ["npm", "start"]
