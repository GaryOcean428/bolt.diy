ARG BASE=node:20.18.0
FROM ${BASE} AS base

WORKDIR /app

# Install dependencies (this step is cached as long as the dependencies don't change)
COPY package.json pnpm-lock.yaml ./

# Install pnpm using npm instead of corepack to avoid signature verification issues
RUN npm install -g pnpm@9.4.0 && pnpm install

# Copy the rest of your app's source code
COPY . .

# Expose the port - Railway will override this with PORT env var
EXPOSE 3001

# Production image
FROM base AS bolt-ai-production

# Only set environment variables that are needed at build time or have default values
# Railway will inject all other environment variables at runtime
ENV WRANGLER_SEND_METRICS=false \
    RUNNING_IN_DOCKER=true \
    VITE_LOG_LEVEL=debug \
    CI=false \
    NODE_ENV=production

# Pre-configure wrangler to disable metrics
RUN mkdir -p /root/.config/.wrangler && \
    echo '{"enabled":false}' > /root/.config/.wrangler/metrics.json

# Create empty .env.local to prevent bindings.sh from failing
RUN touch .env.local

RUN pnpm run build

CMD [ "pnpm", "run", "server"]

# Development image
FROM base AS bolt-ai-development

# Only set environment variables that are needed at build time or have default values
# Railway will inject all other environment variables at runtime
ENV RUNNING_IN_DOCKER=true \
    PORT=5173 \
    VITE_LOG_LEVEL=debug

# Create empty .env.local to prevent bindings.sh from failing
RUN touch .env.local

# Build the application
RUN pnpm run build

# Use the start command instead of dev for Railway
CMD ["pnpm", "run", "start"]
