import express from 'express';

const app = express();
const port = process.env.PORT || 5173;
const host = '0.0.0.0';

console.log('=== Simple Server Starting ===');
console.log('Port:', port);
console.log('Host:', host);

// Health check endpoint
app.get('/health', (req, res) => {
  console.log('Health check requested');
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    port: port,
    node_version: process.version
  });
});

// Root endpoint
app.get('/', (req, res) => {
  res.json({
    message: 'Simple server is running',
    timestamp: new Date().toISOString()
  });
});

// Start server
app.listen(port, host, () => {
  console.log(`Server listening on http://${host}:${port}`);
  console.log(`Health check: http://${host}:${port}/health`);
}).on('error', (err) => {
  console.error('Server failed to start:', err);
  process.exit(1);
});

// Handle shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received');
  process.exit(0);
});
