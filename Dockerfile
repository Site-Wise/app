# Build stage
FROM node:24-alpine AS builder

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install ALL dependencies — the build (vue-tsc + vite) needs devDependencies.
# This is the builder stage only; the final nginx image carries no node_modules.
RUN npm ci && npm cache clean --force

# Copy source code
COPY . .

# Build-time frontend configuration. Vite inlines VITE_*-prefixed env vars into
# the static bundle, so the backend URL (and friends) must be set BEFORE the
# build. `.env` is intentionally excluded from the build context, so pass these
# as --build-arg for self-hosting, e.g.:
#   docker build --build-arg VITE_POCKETBASE_URL=https://api.example.com -t sitewise-frontend .
ARG VITE_POCKETBASE_URL=http://localhost:8090
ARG VITE_APP_NAME=SiteWise
ARG VITE_APP_ENV=production
ARG VITE_TURNSTILE_SITE_KEY=
ENV VITE_POCKETBASE_URL=$VITE_POCKETBASE_URL \
    VITE_APP_NAME=$VITE_APP_NAME \
    VITE_APP_ENV=$VITE_APP_ENV \
    VITE_TURNSTILE_SITE_KEY=$VITE_TURNSTILE_SITE_KEY

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