// Shared utilities for Netlify Functions

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, Accept, X-Requested-With',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Max-Age': '86400',
  'Content-Type': 'application/json'
};

function getApiResponse(statusCode, data, headers = {}) {
  return {
    statusCode,
    headers: { ...corsHeaders, ...headers },
    body: JSON.stringify(data)
  };
}

function getErrorResponse(statusCode, message, details = null) {
  return getApiResponse(statusCode, {
    error: true,
    message,
    details,
    timestamp: new Date().toISOString()
  });
}

function logInfo(message, data = null) {
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}] INFO: ${message}`, data ? JSON.stringify(data) : '');
}

function logError(message, error = null) {
  const timestamp = new Date().toISOString();
  console.error(`[${timestamp}] ERROR: ${message}`, error ? error.stack || error : '');
}

// Handle CORS preflight
function handleCors(event) {
  if (event.httpMethod === 'OPTIONS') {
    return getApiResponse(200, { message: 'CORS preflight' });
  }
  return null;
}

// Simple cache implementation
const cache = new Map();
const CACHE_DURATION = 10 * 60 * 1000; // 10 minutes

function getCachedData(key) {
  const cached = cache.get(key);
  if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
    logInfo(`Cache hit for ${key} (age: ${Math.floor((Date.now() - cached.timestamp) / 60000)}min)`);
    return cached.data;
  }
  return null;
}

function setCachedData(key, data) {
  cache.set(key, {
    data,
    timestamp: Date.now()
  });
  logInfo(`Cached data for ${key} (10min TTL)`);
}

function clearCache() {
  cache.clear();
  logInfo('Cache cleared');
}

module.exports = {
  getApiResponse,
  getErrorResponse,
  logInfo,
  logError,
  handleCors,
  getCachedData,
  setCachedData,
  clearCache,
  corsHeaders
};