# Build stage for client
FROM node:20-alpine AS client-builder
WORKDIR /app/client
COPY client/package*.json ./
RUN npm ci
COPY client/ ./
RUN npm run build

# Build stage for server
FROM node:20-alpine AS server-builder
WORKDIR /app/server
COPY server/package*.json ./
RUN npm ci
COPY server/ ./
RUN npm run build

# Production stage
FROM node:20-alpine AS production
WORKDIR /app

# Copy server build and dependencies
COPY --from=server-builder /app/server/dist ./dist
COPY --from=server-builder /app/server/package*.json ./
RUN npm ci --only=production

# Copy client build
COPY --from=client-builder /app/client/dist ./public

# Expose port
EXPOSE 8080

# Start server
CMD ["node", "dist/index.js"]
