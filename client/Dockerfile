# =========================================================================
# Stage 1: Build Frontend Assets with Vite
# =========================================================================
FROM node:20-alpine AS builder

WORKDIR /app

# Copy dependency manifests
COPY package*.json ./

# Install frontend dependencies
RUN npm ci

# Copy client source code
COPY . ./

# Build production bundle
RUN npm run build

# =========================================================================
# Stage 2: Serve with Production-Grade Nginx Alpine
# =========================================================================
FROM nginx:alpine AS runner

# Remove default nginx welcome site
RUN rm -rf /usr/share/nginx/html/*

# Copy compiled SPA static files from builder stage
COPY --from=builder /app/dist /usr/share/nginx/html

# Copy custom Nginx configuration (SPA routing & reverse proxy)
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

# Healthcheck
HEALTHCHECK --interval=30s --timeout=5s --start-period=5s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:80/ || exit 1

CMD ["nginx", "-g", "daemon off;"]
