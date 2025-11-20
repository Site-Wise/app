# Build stage
FROM node:25-alpine AS builder

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci --only=production && npm cache clean --force

# Copy source code
COPY . .

# Build the application
RUN npm run build

# Production stage
FROM nginx:alpine AS production

# Copy custom nginx config
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Copy built application from builder stage
COPY --from=builder /app/dist /usr/share/nginx/html

# Add labels for metadata
LABEL org.opencontainers.image.title="SiteWise"
LABEL org.opencontainers.image.description="Construction Site Management Application"
LABEL org.opencontainers.image.vendor="SiteWise"
LABEL org.opencontainers.image.source="https://github.com/site-wise/app"

# Create non-root user for security
RUN addgroup -g 1001 -S nodejs && \
    adduser -S vuejs -u 1001

# Change ownership of nginx files
RUN chown -R vuejs:nodejs /usr/share/nginx/html && \
    chown -R vuejs:nodejs /var/cache/nginx && \
    chown -R vuejs:nodejs /var/log/nginx && \
    chown -R vuejs:nodejs /etc/nginx/conf.d && \
    touch /var/run/nginx.pid && \
    chown -R vuejs:nodejs /var/run/nginx.pid

# Switch to non-root user
USER vuejs

# Expose port
EXPOSE 8080

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:8080 || exit 1

# Start nginx
CMD ["nginx", "-g", "daemon off;"]