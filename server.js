const express = require('express');
const compression = require('compression');
const morgan = require('morgan');
const { createRequestHandler } = require('@remix-run/express');
const path = require('path');

const app = express();

app.use(compression());

// http://expressjs.com/en/advanced/best-practice-security.html#at-a-minimum-disable-x-powered-by-header
app.disable('x-powered-by');

// Remix fingerprints its assets so we can cache forever.
app.use('/build', express.static('build', { immutable: true, maxAge: '1y' }));

// Everything else (like favicon.ico) is cached for an hour. You may want to be
// more aggressive with this caching.
app.use(express.static('build', { maxAge: '1h' }));

app.use(morgan('tiny'));

const BUILD_DIR = path.join(process.cwd(), 'build');

app.all(
  '*',
  createRequestHandler({
    build: require(BUILD_DIR),
    mode: process.env.NODE_ENV,
    getLoadContext() {
      // Return what you need to access in your route loaders
      return {};
    },
  })
);

const port = process.env.PORT || 3001;
const host = process.env.HOST || '0.0.0.0';

app.listen(port, host, () => {
  console.log(`Express server listening on http://${host}:${port}`);
});