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

const BUILD_DIR = path.join(process.cwd(), 'build');

// Check if build directory exists
const fs = require('fs');
if (!fs.existsSync(BUILD_DIR)) {
  console.error('Build directory not found:', BUILD_DIR);
  process.exit(1);
}

const serverBuildPath = path.join(BUILD_DIR, 'server', 'index.js');
if (!fs.existsSync(serverBuildPath)) {
  console.error('Server build not found:', serverBuildPath);
  console.log('Available files in build directory:', fs.readdirSync(BUILD_DIR));
  process.exit(1);
}

let remixBuild;
try {
  remixBuild = require(serverBuildPath);
  console.log('Remix build loaded successfully');
} catch (error) {
  console.error('Failed to load Remix build:', error);
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

app.listen(port, host, () => {
  console.log(`Express server listening on http://${host}:${port}`);
}).on('error', (err) => {
  console.error('Server failed to start:', err);
  process.exit(1);
});