import axios from 'axios';
import { 
  LOCAL_BACKEND_URL, 
  PUBLIC_BACKEND_URL, 
  getAuthHeader
} from '../config';

/**
 * Make an API call with automatic fallback to multiple backend servers
 * 
 * @param {string} endpoint - The API endpoint, should start with /api/
 * @param {Object} options - Request options
 * @param {string} options.method - HTTP method (GET, POST, etc.)
 * @param {Object} options.data - Request data for POST, PUT, etc.
 * @param {Object} options.headers - Additional headers to include
 * @param {number} options.timeout - Request timeout in milliseconds
 * @returns {Promise<Object>} - The API response data
 */
export const callApiWithFallback = async (endpoint, options = {}) => {
  const { method = 'GET', data = null, headers = {}, timeout = 5000 } = options;
  
  // Define fallback URLs in priority order
  const backendUrls = [
    LOCAL_BACKEND_URL,  // Try localhost first (no auth)
    PUBLIC_BACKEND_URL  // Then try public IP (with auth)
  ];
  
  let lastError = null;
  let connectedUrl = null;
  
  // Try each backend in sequence
  for (const baseUrl of backendUrls) {
    try {
      const url = `${baseUrl}${endpoint}`;
      console.log(`Trying API call to: ${url}`);
      
      // Create request config
      const config = { 
        method, 
        url,
        timeout,
        headers: { ...headers } 
      };
      
      // Add request data if present
      if (data) {
        // Handle FormData separately
        if (data instanceof FormData) {
          config.data = data;
          // Don't set Content-Type for FormData - browser will set it with boundary
        } else {
          config.data = data;
          if (!headers['Content-Type']) {
            config.headers['Content-Type'] = 'application/json';
          }
        }
      }
      
      // Add auth headers for public backend
      if (baseUrl === PUBLIC_BACKEND_URL) {
        config.headers = {
          ...config.headers,
          ...getAuthHeader()
        };
      }
      
      // Make the request
      const response = await axios(config);
      
      if (response.status >= 200 && response.status < 300) {
        console.log(`Successfully connected to backend at: ${baseUrl}`);
        connectedUrl = baseUrl;
        return {
          data: response.data,
          status: response.status,
          headers: response.headers,
          connectedBackend: baseUrl === LOCAL_BACKEND_URL ? 'local' : 'public'
        };
      }
    } catch (error) {
      console.log(`Failed to connect to ${baseUrl}: ${error.message}`);
      lastError = error;
    }
  }
  
  // If all backends failed, throw the last error
  throw new Error(`Failed to connect to any backend: ${lastError?.message || 'Unknown error'}`);
};

/**
 * Get the active backend server that is currently connected
 * 
 * @returns {Promise<string>} - 'local', 'public', or 'none'
 */
export const getActiveBackend = async () => {
  try {
    const result = await callApiWithFallback('/api/healthcheck');
    return result.connectedBackend;
  } catch (error) {
    console.error('Failed to determine active backend:', error);
    return 'none';
  }
};

/**
 * Check if either backend server is available
 * 
 * @returns {Promise<boolean>} - true if any backend is available
 */
export const isBackendAvailable = async () => {
  try {
    await callApiWithFallback('/api/healthcheck');
    return true;
  } catch (error) {
    return false;
  }
}; 