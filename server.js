import express from 'express';
import compression from 'compression';
import morgan from 'morgan';
import { createRequestHandler } from '@remix-run/express';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

// Get __dirname equivalent in ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

// Log startup information
console.log('=== Server Starting ===');
console.log('Node version:', process.version);
console.log('Current directory:', process.cwd());
console.log('Environment:', process.env.NODE_ENV || 'production');
console.log('Port:', process.env.PORT || 5173);

app.use(compression());

// http://expressjs.com/en/advanced/best-practice-security.html#at-a-minimum-disable-x-powered-by-header
app.disable('x-powered-by');

// Serve static assets from public directory
app.use(express.static('public', { maxAge: '1h' }));

// Remix fingerprints its assets so we can cache forever.
app.use('/build', express.static('build/client', { immutable: true, maxAge: '1y' }));

app.use(morgan('tiny'));

// Add a simple health check route for Railway - this runs before Remix is loaded
app.get('/health', (req, res) => {
  console.log('Health check requested');
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    server: 'express',
    node_version: process.version,
    uptime: process.uptime()
  });
});

// Add a root health check as fallback
app.get('/', (req, res, next) => {
  // Only handle if it's exactly the root path and no Remix build is loaded yet
  if (req.path === '/' && !app.locals.remixLoaded) {
    console.log('Root health check (Remix not loaded yet)');
    res.json({
      status: 'starting',
      message: 'Server is starting, Remix app not loaded yet',
      timestamp: new Date().toISOString()
    });
  } else {
    next();
  }
});

async function startServer() {
  const BUILD_DIR = path.join(process.cwd(), 'build');

  // Check if build directory exists
  if (!fs.existsSync(BUILD_DIR)) {
    console.error('Build directory not found:', BUILD_DIR);
    process.exit(1);
  }

  console.log('Looking for Remix server build...');
  console.log('Build directory contents:', fs.readdirSync(BUILD_DIR));

  const serverBuildPath = path.join(BUILD_DIR, 'server', 'index.js');
  console.log('Expected server build path:', serverBuildPath);

  if (!fs.existsSync(serverBuildPath)) {
    console.error('Server build not found:', serverBuildPath);

    // Check if server directory exists
    const serverDir = path.join(BUILD_DIR, 'server');
    if (fs.existsSync(serverDir)) {
      console.log('Server directory contents:', fs.readdirSync(serverDir));
    } else {
      console.log('Server directory does not exist');
    }

    // Try alternative build locations
    const alternatives = [
      path.join(BUILD_DIR, 'index.js'),
      path.join(BUILD_DIR, 'server.js'),
      path.join(BUILD_DIR, 'server/server.js')
    ];

    console.log('Checking alternative build locations...');
    for (const altPath of alternatives) {
      if (fs.existsSync(altPath)) {
        console.log('Found alternative build at:', altPath);
        break;
      }
    }

    process.exit(1);
  }

  let remixBuild;
  let remixLoaded = false;

  try {
    console.log('Loading Remix build from:', serverBuildPath);
    // Convert to file:// URL for ES module import
    const buildUrl = new URL(`file://${serverBuildPath}`).href;
    remixBuild = await import(buildUrl);
    console.log('Remix build loaded successfully');
    console.log('Build exports:', Object.keys(remixBuild));

    // Mark that Remix is loaded
    app.locals.remixLoaded = true;
    remixLoaded = true;

    app.all(
      '*',
      createRequestHandler({
        build: remixBuild,
        mode: process.env.NODE_ENV || 'production',
        getLoadContext() {
          // Return what you need to access in your route loaders
          return {};
        },
      })
    );
  } catch (error) {
    console.error('Failed to load Remix build:', error.message);
    console.error('Error details:', error.stack);
    console.warn('⚠️ Server will continue without Remix app - only health check and fallback routes available');

    // Add fallback routes when Remix fails
    app.get('/', (req, res) => {
      res.status(503).json({
        error: 'Service Starting',
        message: 'Application is initializing. Please try again in a moment.',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined,
        health_check_url: '/health',
        timestamp: new Date().toISOString()
      });
    });

    app.all('*', (req, res) => {
      res.status(503).json({
        error: 'Service Starting',
        message: 'Application is initializing. Please try again in a moment.',
        path: req.path,
        method: req.method,
        health_check_url: '/health',
        timestamp: new Date().toISOString()
      });
    });
  }

  const port = process.env.PORT || 5173;
  const host = '0.0.0.0';

  console.log(`Starting server on ${host}:${port}...`);
  console.log('Environment:', {
    NODE_ENV: process.env.NODE_ENV,
    PORT: process.env.PORT,
    PWD: process.cwd()
  });

  const server = app.listen(port, host, () => {
    console.log(`✅ Express server listening on http://${host}:${port}`);
    console.log(`🏥 Health check available at: http://${host}:${port}/health`);
  }).on('error', (err) => {
    console.error('❌ Server failed to start:', err);
    process.exit(1);
  });

  // Handle graceful shutdown
  process.on('SIGTERM', () => {
    console.log('SIGTERM received, shutting down gracefully');
    server.close(() => {
      console.log('Server closed');
      process.exit(0);
    });
  });
}

// Start the server
startServer().catch((error) => {
  console.error('Failed to start server:', error);
  process.exit(1);
});
