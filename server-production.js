import express from 'express';
import compression from 'compression';
import morgan from 'morgan';
import { createRequestHandler } from '@remix-run/express';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';

// Get __dirname equivalent in ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

// Log startup information
console.log('=== Production Server Starting ===');
console.log('Node version:', process.version);
console.log('Current directory:', process.cwd());
console.log('Environment:', process.env.NODE_ENV || 'production');
console.log('Port:', process.env.PORT || 5173);

app.use(compression());
app.disable('x-powered-by');

// CRITICAL: Set up health check FIRST - this must always work
app.get('/health', (req, res) => {
  console.log(`[${new Date().toISOString()}] Health check requested`);
  res.status(200).json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    server: 'express-production',
    node_version: process.version,
    uptime: process.uptime(),
    env: process.env.NODE_ENV || 'production',
    port: process.env.PORT || 5173,
  });
});

// Serve static assets
app.use(express.static('public', { maxAge: '1h' }));
app.use('/build', express.static('build/client', { immutable: true, maxAge: '1y' }));

// Logging middleware
app.use(morgan('tiny'));

// Global error handler
app.use((err, req, res, next) => {
  console.error('Express error:', err);
  res.status(500).json({
    error: 'Internal Server Error',
    message: process.env.NODE_ENV === 'development' ? err.message : 'Something went wrong',
  });
});

async function startServer() {
  const BUILD_DIR = path.join(process.cwd(), 'build');
  const serverBuildPath = path.join(BUILD_DIR, 'server', 'index.js');

  let remixBuild = null;
  let remixLoaded = false;

  // Try to load Remix build but don't crash if it fails
  try {
    console.log('📁 Checking for build directory...');

    if (!fs.existsSync(BUILD_DIR)) {
      throw new Error(`Build directory not found: ${BUILD_DIR}`);
    }

    console.log('✅ Build directory exists');
    console.log('📦 Build contents:', fs.readdirSync(BUILD_DIR));

    if (!fs.existsSync(serverBuildPath)) {
      // Check server directory
      const serverDir = path.join(BUILD_DIR, 'server');
      if (fs.existsSync(serverDir)) {
        console.log('📦 Server directory contents:', fs.readdirSync(serverDir));
      }
      throw new Error(`Server build not found: ${serverBuildPath}`);
    }

    console.log('🚀 Loading Remix build...');

    // Use a simpler import approach that matches the working server.js
    const buildUrl = new URL(`file://${serverBuildPath}`).href;
    remixBuild = await import(buildUrl);

    console.log('✅ Remix build loaded');
    console.log('📋 Build exports:', Object.keys(remixBuild));

    // Set up Remix request handler
    app.all(
      '*',
      createRequestHandler({
        build: remixBuild,
        mode: process.env.NODE_ENV || 'production',
        getLoadContext() {
          return {};
        },
      })
    );

    remixLoaded = true;
    console.log('✅ Remix handler installed');

  } catch (error) {
    console.error('⚠️ Remix build load failed:', error.message);
    console.error('Stack:', error.stack);

    // Add fallback routes when Remix fails to load
    app.get('/', (req, res) => {
      res.status(503).json({
        error: 'Service Temporarily Unavailable',
        message: 'Application is starting up. Please try again in a moment.',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined,
        health_check_url: '/health',
        timestamp: new Date().toISOString(),
      });
    });

    app.all('*', (req, res) => {
      res.status(503).json({
        error: 'Service Temporarily Unavailable',
        message: 'Application is starting up. Please try again in a moment.',
        path: req.path,
        method: req.method,
        health_check_url: '/health',
        timestamp: new Date().toISOString(),
      });
    });
  }

  const port = process.env.PORT || 5173;
  const host = '0.0.0.0';

  console.log(`🚀 Starting server on ${host}:${port}...`);

  const server = app.listen(port, host, () => {
    console.log(`✅ Express server listening on http://${host}:${port}`);
    console.log(`🏥 Health check available at: http://${host}:${port}/health`);
    console.log(`📊 Server status:`, {
      remix_loaded: remixLoaded,
      node_env: process.env.NODE_ENV || 'production',
      port: port,
      pid: process.pid,
    });

    if (!remixLoaded) {
      console.warn('⚠️ Server running without Remix app - only health check is functional');
    }
  }).on('error', (err) => {
    console.error('❌ Server failed to start:', err);
    process.exit(1);
  });

  // Handle graceful shutdown
  const shutdown = (signal) => {
    console.log(`${signal} received, shutting down gracefully...`);
    server.close(() => {
      console.log('✅ Server closed');
      process.exit(0);
    });

    // Force exit after 10 seconds
    setTimeout(() => {
      console.error('❌ Forced shutdown after timeout');
      process.exit(1);
    }, 10000);
  };

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));
}

// Start the server
console.log('🏁 Initializing production server...');
startServer().catch((error) => {
  console.error('💥 Critical server startup error:', error);
  process.exit(1);
});
