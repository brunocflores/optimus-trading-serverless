const { getApiResponse, getErrorResponse, logInfo, handleCors, clearCache } = require('./utils/helpers');

exports.handler = async (event, context) => {
  // Handle CORS preflight
  const corsResponse = handleCors(event);
  if (corsResponse) return corsResponse;

  try {
    // Only allow DELETE method for cache clearing
    if (event.httpMethod !== 'DELETE' && event.httpMethod !== 'POST') {
      return getErrorResponse(405, 'Method not allowed. Use DELETE or POST.');
    }

    logInfo('Cache clear requested');

    // Clear the cache
    clearCache();

    return getApiResponse(200, {
      message: 'Cache cleared successfully',
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    logError('Cache clear function error:', error);
    return getErrorResponse(500, 'Failed to clear cache', error.message);
  }
};