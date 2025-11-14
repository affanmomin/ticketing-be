ARG PORT=3000
FROM node:22.15.0-slim AS builder

WORKDIR /usr/src/app
COPY package*.json ./
COPY tsconfig.json ./
COPY src ./src

# Install all dependencies (including dev dependencies for building)
RUN npm ci

# Build TypeScript
RUN npm run build

# Production stage
FROM node:22.15.0-slim

ENV PORT=3000
WORKDIR /usr/src/app

# Copy package files
COPY package*.json ./

# Install only production dependencies
RUN npm ci --omit=dev

# Copy built files from builder stage
COPY --from=builder /usr/src/app/dist ./dist

# Copy OpenAPI specification file (required by Swagger plugin)
COPY openapi.yaml ./

# Copy logo file if it exists (for email service)
# Note: This will fail if logo doesn't exist, but that's okay - email service handles missing logo gracefully
COPY saait-logo.png* ./
COPY saait-logo.jpg* ./

EXPOSE ${PORT}
CMD [ "node", "dist/index.js" ]

