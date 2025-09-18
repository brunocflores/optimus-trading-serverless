const fetch = require('node-fetch');
const { getApiResponse, getErrorResponse, logInfo, logError, handleCors, getCachedData, setCachedData } = require('./utils/helpers');

// Import stock fetching logic from stock.js function
const APIS = {
  BRAPI: 'https://brapi.dev/api/quote',
  YAHOO_PROXY: 'https://api.allorigins.win/get?url='
};

async function fetchFromBrapi(symbol) {
  try {
    const response = await fetch(`${APIS.BRAPI}/${symbol}?fundamental=false&dividends=false`, {
      timeout: 8000,
      headers: {
        'User-Agent': 'Optimus-Trading/1.0'
      }
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    const data = await response.json();

    if (!data.results || !data.results[0]) {
      throw new Error('No data found');
    }

    const stock = data.results[0];

    return {
      symbol: stock.symbol,
      price: parseFloat(stock.regularMarketPrice || 0),
      change: parseFloat(stock.regularMarketChange || 0),
      changePercent: parseFloat(stock.regularMarketChangePercent || 0),
      currency: stock.currency || 'BRL',
      timestamp: new Date().toISOString(),
      source: 'Brapi Finance',
      isMocked: false
    };

  } catch (error) {
    throw error;
  }
}

async function fetchFromYahooProxy(symbol) {
  try {
    const yahooUrl = encodeURIComponent(`https://query1.finance.yahoo.com/v8/finance/chart/${symbol}.SA`);
    const response = await fetch(`${APIS.YAHOO_PROXY}${yahooUrl}`, {
      timeout: 10000,
      headers: {
        'User-Agent': 'Optimus-Trading/1.0'
      }
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    const proxyData = await response.json();
    const data = JSON.parse(proxyData.contents);

    if (!data.chart || !data.chart.result || !data.chart.result[0]) {
      throw new Error('No chart data found');
    }

    const result = data.chart.result[0];
    const meta = result.meta;

    if (!meta || typeof meta.regularMarketPrice !== 'number') {
      throw new Error('Invalid price data');
    }

    const currentPrice = meta.regularMarketPrice;
    const previousClose = meta.previousClose || currentPrice;
    const change = currentPrice - previousClose;
    const changePercent = previousClose !== 0 ? (change / previousClose) * 100 : 0;

    return {
      symbol: symbol.toUpperCase(),
      price: parseFloat(currentPrice.toFixed(2)),
      change: parseFloat(change.toFixed(2)),
      changePercent: parseFloat(changePercent.toFixed(2)),
      currency: meta.currency || 'BRL',
      timestamp: new Date().toISOString(),
      source: 'Yahoo Finance (proxy)',
      isMocked: false
    };

  } catch (error) {
    throw error;
  }
}

function generateMockData(symbol) {
  const mockPrices = {
    'PETR4': 38.45, 'VALE3': 58.82, 'ITUB4': 32.25, 'BBDC4': 13.12,
    'ABEV3': 11.94, 'B3SA3': 12.52, 'WEGE3': 51.95, 'MGLU3': 4.72,
    'RENT3': 59.48, 'LREN3': 15.18, 'VIVT3': 41.95, 'JBSS3': 28.64
  };

  const basePrice = mockPrices[symbol.toUpperCase()] || 25.50;
  const variation = (Math.random() - 0.5) * 0.04; // ±2%
  const currentPrice = basePrice * (1 + variation);
  const change = currentPrice - basePrice;
  const changePercent = (change / basePrice) * 100;

  return {
    symbol: symbol.toUpperCase(),
    price: parseFloat(currentPrice.toFixed(2)),
    change: parseFloat(change.toFixed(2)),
    changePercent: parseFloat(changePercent.toFixed(2)),
    currency: 'BRL',
    timestamp: new Date().toISOString(),
    source: '⚠️ Emergency Fallback',
    isMocked: true
  };
}

async function getStockData(symbol) {
  const cacheKey = `stock_${symbol.toUpperCase()}`;

  // Check cache first
  const cached = getCachedData(cacheKey);
  if (cached) {
    return cached;
  }

  let stockData = null;

  // Try Brapi Finance first
  try {
    stockData = await fetchFromBrapi(symbol);
    setCachedData(cacheKey, stockData);
    return stockData;
  } catch (error) {
    // Continue to next API
  }

  // Fallback to Yahoo Finance proxy
  try {
    stockData = await fetchFromYahooProxy(symbol);
    setCachedData(cacheKey, stockData);
    return stockData;
  } catch (error) {
    // Continue to mock data
  }

  // Emergency fallback
  stockData = generateMockData(symbol);
  setCachedData(cacheKey, stockData);
  return stockData;
}

exports.handler = async (event, context) => {
  // Handle CORS preflight
  const corsResponse = handleCors(event);
  if (corsResponse) return corsResponse;

  try {
    // Get symbols from query parameters
    const queryParams = event.queryStringParameters || {};
    const symbolsParam = queryParams.symbols;

    if (!symbolsParam) {
      return getErrorResponse(400, 'Missing symbols parameter - provide only portfolio stocks');
    }

    // Parse symbols
    const symbols = symbolsParam.split(',').map(s => s.trim().toUpperCase()).filter(s => s.length > 0);

    if (symbols.length === 0) {
      return getErrorResponse(400, 'No valid symbols provided');
    }

    if (symbols.length > 20) {
      return getErrorResponse(400, 'Too many symbols requested. Maximum 20 portfolio stocks allowed.');
    }

    logInfo(`Batch request for ${symbols.length} portfolio symbols: ${symbols.join(', ')}`);

    // Fetch all stock data concurrently
    const results = {};
    const errors = [];

    // Use Promise.allSettled to handle individual failures
    const promises = symbols.map(async (symbol) => {
      try {
        const stockData = await getStockData(symbol);
        results[symbol] = stockData;
        logInfo(`✅ Portfolio symbol success: ${symbol} = R$ ${stockData.price}`);
      } catch (error) {
        const errorMsg = `${symbol}: ${error.message}`;
        errors.push(errorMsg);
        logError(`❌ Portfolio symbol failed: ${errorMsg}`);
      }
    });

    await Promise.allSettled(promises);

    logInfo(`Portfolio batch completed: ${Object.keys(results).length}/${symbols.length} successful`);

    return getApiResponse(200, {
      results,
      total_requested: symbols.length,
      total_successful: Object.keys(results).length,
      errors: errors.length > 0 ? errors : null,
      data_source: 'Netlify Serverless Functions',
      cache_duration_minutes: 10,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    logError('Stocks batch function error:', error);
    return getErrorResponse(500, 'Failed to fetch stocks data', error.message);
  }
};