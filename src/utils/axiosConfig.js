import axios from 'axios';

// Configure axios for handling self-signed certificates in development
const configureAxios = () => {
  console.log('Configuring axios for HTTPS connections');
  
  try {
    // Create a custom axios instance with modified settings
    const axiosInstance = axios.create({
      timeout: 10000,
      headers: {
        'Cache-Control': 'no-cache'
      }
    });
    
    // The browser security model prevents bypassing certificate validation from JavaScript
    // We need to inform the user about this limitation
    
    console.log('NOTE: Browser security prevents bypassing SSL certificate validation from JavaScript');
    console.log('Please use one of these options:');
    console.log('1. Create proper SSL certificates for your backend');
    console.log('2. Open Chrome with --ignore-certificate-errors flag');
    console.log('3. Switch to HTTP for development purposes');
    
    return axiosInstance;
  } catch (error) {
    console.error('Error configuring axios:', error);
    return axios;
  }
};

// Export the configured axios instance
export const secureAxios = configureAxios();

// Helper function for fetch API with certificate handling
export const secureFetch = (url, options = {}) => {
  console.log(`Secure fetch to: ${url}`);
  return fetch(url, options);
};

// Export a helper function to join API URLs correctly
export const joinApiUrl = (baseUrl, endpoint) => {
  if (!baseUrl) return endpoint; // Safety check
  return baseUrl.endsWith('/') 
    ? `${baseUrl}${endpoint.startsWith('/') ? endpoint.slice(1) : endpoint}` 
    : `${baseUrl}${endpoint.startsWith('/') ? endpoint : '/' + endpoint}`;
}; 