import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequestHandler } from '@remix-run/express';
import compression from 'compression';
import express from 'express';
import morgan from 'morgan';

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
console.log(
  'Available environment variables:',
  Object.keys(process.env).filter((key) => !key.includes('SECRET') && !key.includes('PASSWORD')),
);

app.use(compression());
app.disable('x-powered-by');

/*
 * IMPORTANT: Set up health check BEFORE any other middleware
 * This ensures it always works, even if other parts fail
 */
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
    const alternatives = [path.join(BUILD_DIR, 'index.js'), path.join(BUILD_DIR, 'server.js')];

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

    // Check if file exists and is readable
    const stats = fs.statSync(buildPath);
    console.log('📊 Build file stats:', {
      size: stats.size,
      isFile: stats.isFile(),
      mode: stats.mode.toString(8),
      created: stats.birthtime,
      modified: stats.mtime,
    });

    // Read first few bytes to check file content
    const fileContent = fs.readFileSync(buildPath, 'utf8');
    console.log('📄 Build file first 200 chars:', fileContent.substring(0, 200));

    // Try different import methods
    let remixBuild;

    try {
      // Method 1: Direct file URL import
      const buildUrl = new URL(`file://${buildPath}`).href;
      console.log('🔗 Trying import with URL:', buildUrl);
      remixBuild = await import(buildUrl);
    } catch (importError) {
      console.error('❌ URL import failed:', importError.message);

      // Method 2: Try with path resolution
      try {
        const resolvedPath = path.resolve(buildPath);
        console.log('🔗 Trying import with resolved path:', resolvedPath);
        remixBuild = await import(resolvedPath);
      } catch (pathError) {
        console.error('❌ Path import failed:', pathError.message);
        throw pathError;
      }
    }

    console.log('✅ Remix build loaded successfully');
    console.log('📋 Build type:', typeof remixBuild);
    console.log('📋 Build exports:', Object.keys(remixBuild));
    console.log('📋 Default export?', !!remixBuild.default);

    // Handle both default and named exports
    const build = remixBuild.default || remixBuild;

    // Validate the build object
    if (!build || typeof build !== 'object') {
      throw new Error('Invalid build object: ' + typeof build);
    }

    // Set up Remix request handler
    app.all(
      '*',
      createRequestHandler({
        build,
        mode: process.env.NODE_ENV || 'production',
        getLoadContext() {
          return {};
        },
      }),
    );

    return true;
  } catch (error) {
    console.error('❌ Failed to load Remix build:', error);
    console.error('Error name:', error.name);
    console.error('Error message:', error.message);
    console.error('Stack trace:', error.stack);

    // Additional debugging for module errors
    if (error.code) {
      console.error('Error code:', error.code);
    }

    if (error.url) {
      console.error('Error URL:', error.url);
    }

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

  const server = app
    .listen(port, host, () => {
      console.log(`✅ Express server listening on http://${host}:${port}`);
      console.log(`🏥 Health check available at: http://${host}:${port}/health`);
      console.log(`📊 Server status:`, {
        remix_loaded: remixLoaded,
        node_env: process.env.NODE_ENV,
        port,
        pid: process.pid,
      });
    })
    .on('error', (err) => {
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
