# Railway Deployment Guide

## Overview
This guide provides troubleshooting steps for Railway deployment issues with the bolt.diy application.

## Common Issues and Solutions

### 1. Port Configuration Issues
**Problem**: Application fails to start or health checks fail
**Solution**: 
- Ensure Dockerfile exposes port 5173 (or Railway's PORT env var)
- Verify railway.toml has correct healthcheckPath: "/health"
- Check server-railway.js uses `process.env.PORT || 5173`

### 2. Start Command Mismatch
**Problem**: Container starts but command not found
**Solution**:
- Dockerfile CMD must match railway.toml startCommand
- Both should use: `pnpm run server:railway`

### 3. Build Dependencies Issues
**Problem**: Dependencies fail to install during Docker build
**Solution**:
- Use --frozen-lockfile flag with pnpm
- Install ca-certificates in Dockerfile
- Use --unsafe-perm for global npm packages

### 4. Environment Variables
**Required Environment Variables**:
- `NODE_ENV=production`
- `PORT` (provided by Railway)
- `WRANGLER_SEND_METRICS=false`
- `RUNNING_IN_DOCKER=true`

**Optional API Keys** (configure in Railway dashboard):
- `OPENAI_API_KEY`
- `ANTHROPIC_API_KEY`
- `GROQ_API_KEY`
- `GOOGLE_GENERATIVE_AI_API_KEY`
- And others as needed

### 5. Health Check Configuration
**Current Setup**:
```toml
healthcheckPath = "/health"
healthcheckTimeout = 60
```

**Verification**:
```bash
curl http://your-app.railway.app/health
```

Should return JSON with status "ok".

### 6. Build Verification
**Check build success**:
- Dockerfile includes `RUN ls -la build/ && ls -la build/server/`
- Ensures build directory and server files exist

### 7. Docker Build Testing
**Local testing**:
```bash
# Build production image
docker build . --target bolt-ai-production --tag bolt-railway-test

# Run container (adjust PORT as needed)
docker run -p 5173:5173 -e PORT=5173 bolt-railway-test

# Test health endpoint
curl http://localhost:5173/health
```

## Deployment Checklist

- [ ] Dockerfile CMD matches railway.toml startCommand
- [ ] Correct port exposed (5173)
- [ ] Health check endpoint works
- [ ] Environment variables configured
- [ ] Build process completes successfully
- [ ] Dependencies install without errors

## Railway-Specific Optimizations

1. **Multi-stage build**: Reduces final image size
2. **Layer caching**: Dependencies installed before copying source code
3. **Health checks**: Configured for Railway's monitoring
4. **Environment handling**: Railway injects variables at runtime
5. **Restart policy**: ON_FAILURE with 10 retries for stability

## Troubleshooting Commands

```bash
# Check Railway logs
railway logs

# Redeploy
railway up

# Check service status
railway status

# Set environment variable
railway variables set VARIABLE_NAME=value
```