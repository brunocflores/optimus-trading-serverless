const { getApiResponse, logInfo } = require('./utils/helpers');

exports.handler = async (event, context) => {
  logInfo('Health check requested');

  const data = {
    status: 'healthy',
    timestamp: new Date().toISOString(),
    service: 'Optimus Trading Serverless API',
    version: '1.0.0',
    features: [
      'Netlify Functions',
      'CORS enabled',
      'yfinance integration',
      '10min cache',
      'portfolio-only fetching'
    ],
    environment: process.env.NODE_ENV || 'production'
  };

  return getApiResponse(200, data);
};