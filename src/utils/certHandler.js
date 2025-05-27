// Certificate Handler Utility
import { secureAxios, joinApiUrl } from './axiosConfig';

// Certificate handling configuration
const CERT_CONFIG = {
  // Flag to enable/disable certificate handling
  BYPASS_ENABLED: true,
  
  // Server URLs
  DIRECT_SERVER: 'https://172.208.104.103:8080',
  PROXY_SERVER: 'http://localhost:3001',
  
  // Should we use the proxy in development mode?
  USE_PROXY_IN_DEV: true
};

/**
 * Gets the appropriate server URL based on environment and configuration
 * 
 * @returns {string} The server URL to use
 */
export const getServerUrl = () => {
  // In development, use proxy if enabled
  if (process.env.NODE_ENV === 'development' && CERT_CONFIG.USE_PROXY_IN_DEV) {
    console.log('Using development proxy for certificate handling');
    return CERT_CONFIG.PROXY_SERVER;
  }
  
  // In production or if proxy is disabled, use direct server
  return CERT_CONFIG.DIRECT_SERVER;
};

/**
 * Make a GET request that handles certificate issues
 * 
 * @param {string} endpoint - The API endpoint to call
 * @param {Object} options - Additional axios options
 * @returns {Promise} - The axios promise
 */
export const secureGet = async (endpoint, options = {}) => {
  const baseUrl = getServerUrl();
  const url = joinApiUrl(baseUrl, endpoint);
  
  console.log(`Making secure GET request to ${url}`);
  return secureAxios.get(url, options);
};

/**
 * Make a POST request that handles certificate issues
 * 
 * @param {string} endpoint - The API endpoint to call
 * @param {Object} data - The data to send
 * @param {Object} options - Additional axios options
 * @returns {Promise} - The axios promise
 */
export const securePost = async (endpoint, data, options = {}) => {
  const baseUrl = getServerUrl();
  const url = joinApiUrl(baseUrl, endpoint);
  
  console.log(`Making secure POST request to ${url}`);
  return secureAxios.post(url, data, options);
};

/**
 * Make a fetch request that handles certificate issues
 * 
 * @param {string} endpoint - The API endpoint to call
 * @param {Object} options - Fetch options
 * @returns {Promise} - The fetch promise
 */
export const secureFetch = async (endpoint, options = {}) => {
  const baseUrl = getServerUrl();
  const url = joinApiUrl(baseUrl, endpoint);
  
  console.log(`Making secure fetch request to ${url}`);
  return fetch(url, options);
};

// Export the certificate configuration for reference
export const certConfig = CERT_CONFIG; 