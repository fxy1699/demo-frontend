// Server Connection Test Script
// Run with: node server-connection-test.js

const http = require('http');
const https = require('https');
const readline = require('readline');

const SERVER_IP = '172.208.104.103';
const SERVER_PORT = 8080;
const TEST_ENDPOINT = '/api/healthcheck';

// Create readline interface for user input
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

// Function to test HTTP connection
function testHttp() {
  console.log(`\nTesting HTTP connection to ${SERVER_IP}:${SERVER_PORT}${TEST_ENDPOINT}...`);
  
  const options = {
    hostname: SERVER_IP,
    port: SERVER_PORT,
    path: TEST_ENDPOINT,
    method: 'GET',
    timeout: 5000,
    headers: {
      'User-Agent': 'Node.js Server Test Script'
    }
  };
  
  const req = http.request(options, (res) => {
    console.log(`\n✓ HTTP Connection successful!`);
    console.log(`Status: ${res.statusCode} ${res.statusMessage}`);
    console.log('Headers:', res.headers);
    
    let data = '';
    res.on('data', (chunk) => {
      data += chunk;
    });
    
    res.on('end', () => {
      console.log('Response body:', data || '(empty)');
      testHttps();
    });
  });
  
  req.on('error', (error) => {
    console.error(`\n✗ HTTP Connection failed: ${error.message}`);
    if (error.code === 'ECONNRESET') {
      console.log('\nThe connection was reset by the server. This might mean:');
      console.log('- The server requires HTTPS and is actively rejecting HTTP');
      console.log('- There is a firewall blocking HTTP connections');
      console.log('- The server is configured to reject certain types of requests');
    }
    testHttps();
  });
  
  req.on('timeout', () => {
    req.destroy();
    console.error('\n✗ HTTP Connection timed out after 5 seconds');
    testHttps();
  });
  
  req.end();
}

// Function to test HTTPS connection
function testHttps() {
  console.log(`\nTesting HTTPS connection to ${SERVER_IP}:${SERVER_PORT}${TEST_ENDPOINT}...`);
  
  const options = {
    hostname: SERVER_IP,
    port: SERVER_PORT,
    path: TEST_ENDPOINT,
    method: 'GET',
    timeout: 5000,
    headers: {
      'User-Agent': 'Node.js Server Test Script'
    },
    rejectUnauthorized: false // Allow self-signed certificates
  };
  
  const req = https.request(options, (res) => {
    console.log(`\n✓ HTTPS Connection successful!`);
    console.log(`Status: ${res.statusCode} ${res.statusMessage}`);
    console.log('Headers:', res.headers);
    
    let data = '';
    res.on('data', (chunk) => {
      data += chunk;
    });
    
    res.on('end', () => {
      console.log('Response body:', data || '(empty)');
      showSummary();
    });
  });
  
  req.on('error', (error) => {
    console.error(`\n✗ HTTPS Connection failed: ${error.message}`);
    if (error.code === 'EPROTO') {
      console.log('\nProtocol error occurred. This might mean:');
      console.log('- The server is configured for HTTP, not HTTPS');
      console.log('- The SSL configuration on the server is incorrect');
    }
    showSummary();
  });
  
  req.on('timeout', () => {
    req.destroy();
    console.error('\n✗ HTTPS Connection timed out after 5 seconds');
    showSummary();
  });
  
  req.end();
}

// Show summary and recommendations
function showSummary() {
  console.log('\n-----------------------------------------------');
  console.log('CONNECTION TEST COMPLETE');
  console.log('-----------------------------------------------');
  console.log('If both HTTP and HTTPS failed, check:');
  console.log('1. Is the server running? Try restarting it.');
  console.log('2. Is the port (8080) correct?');
  console.log('3. Is there a firewall blocking connections?');
  console.log('4. Try connecting via the localhost address if running locally.');
  console.log('\nIf HTTP failed but HTTPS worked:');
  console.log('- Configure the frontend to use HTTPS but handle certificate validation.');
  console.log('\nIf HTTPS failed but HTTP worked:');
  console.log('- Configure the frontend to use HTTP for development.');
  console.log('- For production, set up proper HTTPS on the server.');
  console.log('\n-----------------------------------------------');
  
  rl.question('\nDo you want to check another endpoint? (y/n): ', (answer) => {
    if (answer.toLowerCase() === 'y') {
      rl.question('Enter the endpoint (e.g., /api/prompts): ', (endpoint) => {
        console.log(`\nTesting custom endpoint: ${endpoint}`);
        testCustomEndpoint(endpoint);
      });
    } else {
      rl.close();
    }
  });
}

// Test a custom endpoint
function testCustomEndpoint(endpoint) {
  // First try HTTP
  const options = {
    hostname: SERVER_IP,
    port: SERVER_PORT,
    path: endpoint,
    method: 'GET',
    timeout: 5000,
    headers: {
      'User-Agent': 'Node.js Server Test Script'
    }
  };
  
  console.log(`Testing HTTP connection to ${SERVER_IP}:${SERVER_PORT}${endpoint}...`);
  
  const req = http.request(options, (res) => {
    console.log(`\n✓ HTTP Connection successful!`);
    console.log(`Status: ${res.statusCode} ${res.statusMessage}`);
    
    let data = '';
    res.on('data', (chunk) => {
      data += chunk;
    });
    
    res.on('end', () => {
      console.log('Response body:', data.substring(0, 200) + (data.length > 200 ? '...' : ''));
      rl.close();
    });
  });
  
  req.on('error', (error) => {
    console.error(`\n✗ HTTP Connection failed: ${error.message}`);
    console.log('Trying HTTPS instead...');
    
    // Try HTTPS if HTTP fails
    const httpsOptions = { ...options, rejectUnauthorized: false };
    const httpsReq = https.request(httpsOptions, (res) => {
      console.log(`\n✓ HTTPS Connection successful!`);
      console.log(`Status: ${res.statusCode} ${res.statusMessage}`);
      
      let data = '';
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        console.log('Response body:', data.substring(0, 200) + (data.length > 200 ? '...' : ''));
        rl.close();
      });
    });
    
    httpsReq.on('error', (httpsError) => {
      console.error(`\n✗ HTTPS Connection also failed: ${httpsError.message}`);
      console.log('Could not connect to the endpoint with either HTTP or HTTPS.');
      rl.close();
    });
    
    httpsReq.end();
  });
  
  req.end();
}

// Start the tests
console.log('===== SERVER CONNECTION TEST =====');
console.log(`Target server: ${SERVER_IP}:${SERVER_PORT}`);
console.log('This script will test both HTTP and HTTPS connections to your server.');
testHttp(); 