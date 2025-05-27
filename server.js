const express = require('express');
const path = require('path');
const fetch = require('node-fetch');
const fs = require('fs');
const { execSync } = require('child_process');
const app = express();
const port = process.env.PORT || 3001;

// Define environment
const isDevelopment = process.env.NODE_ENV !== 'production';
console.log(`Running in ${isDevelopment ? 'development' : 'production'} mode`);
console.log(`Current directory: ${__dirname}`);

// Check if the build directory exists; if not, try to build the project
const buildDir = path.join(__dirname, 'build');
console.log(`Looking for build directory at: ${buildDir}`);

if (!fs.existsSync(buildDir) || !fs.existsSync(path.join(buildDir, 'index.html'))) {
  console.log('Build directory not found or incomplete. Attempting to build React app...');
  try {
    // Install dependencies if node_modules doesn't exist
    if (!fs.existsSync(path.join(__dirname, 'node_modules'))) {
      console.log('Installing dependencies...');
      execSync('npm install', { stdio: 'inherit', cwd: __dirname });
    }
    
    console.log('Building React app...');
    execSync('npm run build', { stdio: 'inherit', cwd: __dirname });
    console.log('Build completed successfully');
  } catch (error) {
    console.error('Build failed:', error.message);
    if (!fs.existsSync(buildDir)) {
      fs.mkdirSync(buildDir, { recursive: true });
      fs.writeFileSync(path.join(buildDir, 'index.html'), 
        '<html><body><h1>Build Error</h1><p>The application failed to build.</p></body></html>');
    }
  }
}

// Log the contents of the build directory to help debug
try {
  console.log('Contents of build directory:');
  if (fs.existsSync(buildDir)) {
    const files = fs.readdirSync(buildDir);
    console.log(files);
  } else {
    console.log('Build directory does not exist.');
  }
} catch (error) {
  console.error('Error reading build directory:', error);
}

// Serve static files from the React app - try different paths for Vercel
app.use(express.static(path.join(__dirname, 'build')));

// Parse JSON body
app.use(express.json());

// Add specific CORS settings for Ollama API access
app.use((req, res, next) => {
  // Set CORS headers for all responses
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS, PUT, DELETE');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
  
  // Handle OPTIONS preflight requests
  if (req.method === 'OPTIONS') {
    return res.sendStatus(200);
  }
  
  next();
});

// For Vercel, we simplify backend handling (no child processes)
let backendUrl = process.env.BACKEND_URL || 'http://localhost:5001';

// API endpoint to check backend status
app.get('/api/backend-status', async (req, res) => {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 2000); // 2 second timeout
    
    const response = await fetch(`${backendUrl}/api/healthcheck`, { 
      method: 'GET',
      signal: controller.signal
    }).finally(() => {
      clearTimeout(timeoutId);
    });
    
    res.status(200).json({ 
      isRunning: response.ok, 
      isStarting: false,
      backendUrl,
      mode: isDevelopment ? 'development' : 'production'
    });
  } catch (error) {
    res.status(200).json({ 
      isRunning: false, 
      isStarting: false,
      backendUrl,
      error: error.message,
      mode: isDevelopment ? 'development' : 'production'
    });
  }
});

// In production mode, provide a mock endpoint
app.post('/api/start-backend', async (req, res) => {
  return res.status(200).json({ 
    message: 'In production mode, backend must be started separately' 
  });
});

// Debug endpoint to check the app
app.get('/debug', (req, res) => {
  res.json({
    environment: process.env.NODE_ENV,
    buildPath: buildDir,
    buildExists: fs.existsSync(buildDir),
    indexExists: fs.existsSync(path.join(buildDir, 'index.html')),
    currentDir: __dirname,
    files: fs.existsSync(buildDir) ? fs.readdirSync(buildDir) : []
  });
});

// All other routes should serve the React app
app.get('*', (req, res) => {
  // Log the request for debugging
  console.log(`Received request: ${req.path}`);
  
  const indexPath = path.join(__dirname, 'build', 'index.html');
  
  if (fs.existsSync(indexPath)) {
    res.sendFile(indexPath);
  } else {
    res.status(404).send('index.html not found. Please check the build process.');
  }
});

// Start the server if not being used as a module
if (require.main === module) {
  app.listen(port, () => {
    console.log(`Server running on port ${port}`);
  });
}

// Export the app for Vercel serverless functions
module.exports = app; 