const fetch = require('node-fetch');
const { getApiResponse, getErrorResponse, logInfo, logError, handleCors, getCachedData, setCachedData } = require('./utils/helpers');

// Stock APIs configuration
const APIS = {
  BRAPI: 'https://brapi.dev/api/quote',
  YAHOO_PROXY: 'https://api.allorigins.win/get?url='
};

async function fetchFromBrapi(symbol) {
  try {
    logInfo(`Fetching ${symbol} from Brapi Finance`);

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
    logError(`Brapi Finance failed for ${symbol}:`, error);
    throw error;
  }
}

async function fetchFromYahooProxy(symbol) {
  try {
    logInfo(`Fetching ${symbol} from Yahoo Finance (proxy)`);

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
    logError(`Yahoo Finance proxy failed for ${symbol}:`, error);
    throw error;
  }
}

function generateMockData(symbol) {
  logError(`ALL APIS FAILED for ${symbol} - Using emergency fallback`);

  // Mock prices based on common Brazilian stocks
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

  // Try Brapi Finance first (Brazilian API, most reliable)
  try {
    stockData = await fetchFromBrapi(symbol);
    setCachedData(cacheKey, stockData);
    logInfo(`✅ Brapi success: ${symbol} = R$ ${stockData.price} (${stockData.changePercent >= 0 ? '+' : ''}${stockData.changePercent.toFixed(2)}%)`);
    return stockData;
  } catch (error) {
    logError(`Brapi failed for ${symbol}:`, error);
  }

  // Fallback to Yahoo Finance proxy
  try {
    stockData = await fetchFromYahooProxy(symbol);
    setCachedData(cacheKey, stockData);
    logInfo(`✅ Yahoo proxy success: ${symbol} = R$ ${stockData.price} (${stockData.changePercent >= 0 ? '+' : ''}${stockData.changePercent.toFixed(2)}%)`);
    return stockData;
  } catch (error) {
    logError(`Yahoo proxy failed for ${symbol}:`, error);
  }

  // Emergency fallback
  stockData = generateMockData(symbol);
  setCachedData(cacheKey, stockData);
  logInfo(`⚠️ Fallback used: ${symbol} = R$ ${stockData.price} (${stockData.changePercent >= 0 ? '+' : ''}${stockData.changePercent.toFixed(2)}%)`);
  return stockData;
}

exports.handler = async (event, context) => {
  // Handle CORS preflight
  const corsResponse = handleCors(event);
  if (corsResponse) return corsResponse;

  try {
    // Extract symbol from path
    const pathParts = event.path.split('/');
    const symbol = pathParts[pathParts.length - 1];

    if (!symbol || symbol.length < 2) {
      return getErrorResponse(400, 'Invalid or missing stock symbol');
    }

    logInfo(`Stock quote requested for: ${symbol}`);

    const stockData = await getStockData(symbol);

    return getApiResponse(200, stockData);

  } catch (error) {
    logError('Stock function error:', error);
    return getErrorResponse(500, 'Failed to fetch stock data', error.message);
  }
};