ARG BASE=node:20.18.0
FROM ${BASE} AS base

WORKDIR /app

# Install system dependencies for Railway compatibility
RUN apt-get update && apt-get install -y \
    ca-certificates \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Install dependencies (this step is cached as long as the dependencies don't change)
COPY package.json pnpm-lock.yaml ./

# Install pnpm and dependencies with Railway-optimized settings
RUN npm config set registry https://registry.npmjs.org/ && \
    npm install -g pnpm@9.4.0 --unsafe-perm && \
    pnpm install --frozen-lockfile

# Copy the rest of your app's source code
COPY . .

# Expose the port - Railway will override this with PORT env var
EXPOSE 5173

# Production image
FROM base AS bolt-ai-production

# Railway-optimized environment variables
ENV WRANGLER_SEND_METRICS=false \
    RUNNING_IN_DOCKER=true \
    VITE_LOG_LEVEL=debug \
    CI=false \
    NODE_ENV=production \
    PORT=5173

# Pre-configure wrangler to disable metrics
RUN mkdir -p /root/.config/.wrangler && \
    echo '{"enabled":false}' > /root/.config/.wrangler/metrics.json

# Create empty .env.local to prevent bindings.sh from failing
RUN touch .env.local

# Build the application
RUN pnpm run build

# Verify build was successful
RUN ls -la build/ && ls -la build/server/

# Health check for Railway
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD curl -f http://localhost:${PORT:-5173}/health || exit 1

CMD [ "pnpm", "run", "server:railway"]

# Development image
FROM base AS bolt-ai-development

# Development environment variables
ENV RUNNING_IN_DOCKER=true \
    PORT=5173 \
    VITE_LOG_LEVEL=debug \
    NODE_ENV=development

# Create empty .env.local to prevent bindings.sh from failing
RUN touch .env.local

# Build the application
RUN pnpm run build

# Use the start command instead of dev for Railway
CMD ["pnpm", "run", "start"]
