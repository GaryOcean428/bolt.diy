const express = require('express');
const compression = require('compression');
const morgan = require('morgan');
const { createRequestHandler } = require('@remix-run/express');
const path = require('path');

const app = express();

app.use(compression());

// http://expressjs.com/en/advanced/best-practice-security.html#at-a-minimum-disable-x-powered-by-header
app.disable('x-powered-by');

// Serve static assets from public directory
app.use(express.static('public', { maxAge: '1h' }));

// Remix fingerprints its assets so we can cache forever.
app.use('/build', express.static('build/client', { immutable: true, maxAge: '1y' }));

app.use(morgan('tiny'));

// Add a simple health check route for Railway
app.get('/health', (req, res) => {
  res.json({ 
    status: 'ok',
    timestamp: new Date().toISOString(),
    server: 'express'
  });
});

const BUILD_DIR = path.join(process.cwd(), 'build');

// Check if build directory exists
const fs = require('fs');
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
try {
  console.log('Loading Remix build from:', serverBuildPath);
  remixBuild = require(serverBuildPath);
  console.log('Remix build loaded successfully');
  console.log('Build exports:', Object.keys(remixBuild));
} catch (error) {
  console.error('Failed to load Remix build:', error);
  console.error('Error details:', error.stack);
  process.exit(1);
}

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

const port = process.env.PORT || 3001;
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