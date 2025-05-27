// Development Proxy Server
// This script creates a local proxy server that forwards requests to your backend
// while handling SSL certificate validation issues

const express = require('express');
const { createProxyMiddleware } = require('http-proxy-middleware');
const cors = require('cors');
const app = express();
const port = 3001;

// Target backend server
const BACKEND_SERVER = 'https://172.208.104.103:8080';

// Configure CORS
app.use(cors());

// Log all requests
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
  next();
});

// Create proxy middleware
const apiProxy = createProxyMiddleware('/api', {
  target: BACKEND_SERVER,
  changeOrigin: true,
  secure: false, // Ignore SSL certificate validation issues
  pathRewrite: {
    '^/api': '/api' // Keep the /api prefix
  },
  logLevel: 'debug',
  onProxyReq: (proxyReq, req, res) => {
    console.log(`Proxying request to: ${BACKEND_SERVER}${proxyReq.path}`);
  },
  onError: (err, req, res) => {
    console.error('Proxy Error:', err);
    res.status(500).send({
      error: 'Proxy Error',
      message: err.message,
      details: 'The proxy server couldn\'t connect to the backend.'
    });
  }
});

// Apply proxy middleware
app.use('/api', apiProxy);

// Health check endpoint
app.get('/health', (req, res) => {
  res.send({
    status: 'ok',
    timestamp: new Date().toISOString(),
    proxy_target: BACKEND_SERVER
  });
});

// Start the server
app.listen(port, () => {
  console.log(`
╔═══════════════════════════════════════════════════════════╗
║                                                           ║
║   Development Proxy Server                                ║
║                                                           ║
║   Local proxy:  http://localhost:${port}                    ║
║   Target:       ${BACKEND_SERVER}              ║
║                                                           ║
║   This proxy will forward all /api/* requests to the      ║
║   backend server while handling SSL certificate issues.   ║
║                                                           ║
╚═══════════════════════════════════════════════════════════╝

To use this proxy:
1. Update your frontend config.js file to use "http://localhost:${port}" as the API_BASE_URL
2. Run your frontend application with "npm start"

This proxy server ignores SSL certificate validation issues.
`);
});

/*
Installation Instructions:

1. Install required dependencies:
   npm install express http-proxy-middleware cors

2. Run this script:
   node development-proxy.js

3. Update your frontend config.js to use http://localhost:3001 as the API base URL
*/ 