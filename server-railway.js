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
console.log('=== Railway Server Starting ===');
console.log('Node version:', process.version);
console.log('Current directory:', process.cwd());
console.log('Environment:', process.env.NODE_ENV || 'production');
console.log('Port:', process.env.PORT || 5173);
console.log('Available environment variables:', Object.keys(process.env).filter(key => !key.includes('SECRET') && !key.includes('PASSWORD')));

app.use(compression());
app.disable('x-powered-by');

// IMPORTANT: Set up health check BEFORE any other middleware
// This ensures it always works, even if other parts fail
app.get('/health', (req, res) => {
  console.log(`[${new Date().toISOString()}] Health check requested from ${req.ip}`);
  res.status(200).json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    server: 'express-railway',
    node_version: process.version,
    uptime: process.uptime(),
    memory: process.memoryUsage(),
    env: process.env.NODE_ENV || 'production',
    port: process.env.PORT || 5173,
  });
});

// Serve static assets
app.use(express.static('public', { maxAge: '1h' }));
app.use('/build', express.static('build/client', { immutable: true, maxAge: '1y' }));

// Logging middleware
app.use(morgan('tiny'));

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Express error:', err);
  res.status(500).json({
    error: 'Internal Server Error',
    message: process.env.NODE_ENV === 'development' ? err.message : 'Something went wrong',
  });
});

async function setupRemixHandler() {
  const BUILD_DIR = path.join(process.cwd(), 'build');

  // Check if build directory exists
  if (!fs.existsSync(BUILD_DIR)) {
    console.error('❌ Build directory not found:', BUILD_DIR);
    console.error('Make sure to run "pnpm run build" before starting the server');
    return false;
  }

  console.log('📁 Build directory found:', BUILD_DIR);

  try {
    const buildContents = fs.readdirSync(BUILD_DIR);
    console.log('📦 Build directory contents:', buildContents);

    const serverDir = path.join(BUILD_DIR, 'server');
    if (fs.existsSync(serverDir)) {
      const serverContents = fs.readdirSync(serverDir);
      console.log('📦 Server directory contents:', serverContents);
    }
  } catch (error) {
    console.error('❌ Error reading build directory:', error);
  }

  const serverBuildPath = path.join(BUILD_DIR, 'server', 'index.js');
  console.log('🔍 Looking for server build at:', serverBuildPath);

  if (!fs.existsSync(serverBuildPath)) {
    console.error('❌ Server build not found at expected location');

    // Try alternative locations
    const alternatives = [
      path.join(BUILD_DIR, 'index.js'),
      path.join(BUILD_DIR, 'server.js'),
    ];

    for (const altPath of alternatives) {
      if (fs.existsSync(altPath)) {
        console.log('✅ Found build at alternative location:', altPath);
        return await loadRemixBuild(altPath);
      }
    }

    console.error('❌ Could not find Remix server build in any expected location');
    return false;
  }

  return await loadRemixBuild(serverBuildPath);
}

async function loadRemixBuild(buildPath) {
  try {
    console.log('🚀 Loading Remix build from:', buildPath);
    const buildUrl = new URL(`file://${buildPath}`).href;
    const remixBuild = await import(buildUrl);

    console.log('✅ Remix build loaded successfully');
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

    return true;
  } catch (error) {
    console.error('❌ Failed to load Remix build:', error);
    console.error('Stack trace:', error.stack);
    return false;
  }
}

async function startServer() {
  // Try to set up Remix, but don't fail if it doesn't work
  const remixLoaded = await setupRemixHandler();

  if (!remixLoaded) {
    console.warn('⚠️ Starting server without Remix app (health check will still work)');

    // Add a fallback route for root
    app.get('/', (req, res) => {
      res.json({
        status: 'server_running',
        message: 'Server is running but Remix app is not loaded',
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
      node_env: process.env.NODE_ENV,
      port: port,
      pid: process.pid,
    });
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
      console.error('❌ Could not close connections in time, forcefully shutting down');
      process.exit(1);
    }, 10000);
  };

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));

  // Handle uncaught errors
  process.on('uncaughtException', (error) => {
    console.error('❌ Uncaught Exception:', error);
    shutdown('UNCAUGHT_EXCEPTION');
  });

  process.on('unhandledRejection', (reason, promise) => {
    console.error('❌ Unhandled Rejection at:', promise, 'reason:', reason);
    shutdown('UNHANDLED_REJECTION');
  });
}

// Start the server
console.log('🏁 Initializing server...');
startServer().catch((error) => {
  console.error('💥 Critical error during server startup:', error);
  process.exit(1);
});
