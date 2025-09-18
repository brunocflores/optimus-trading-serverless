// API Configuration for Optimus Trading Serverless
class APIConfig {
  constructor() {
    // Detect if running on Netlify
    this.isNetlify = window.location.hostname.includes('.netlify.app') ||
                     window.location.hostname.includes('.netlify.com') ||
                     window.location.hostname.includes('brunocflores.github.io');

    this.isDevelopment = window.location.hostname === 'localhost' ||
                        window.location.hostname === '127.0.0.1' ||
                        window.location.port === '8888'; // Netlify dev

    // API Base URLs
    this.API_URLS = {
      // Production: Netlify Functions (same domain)
      production: window.location.origin,

      // Development: Netlify dev server
      development: 'http://localhost:8888',

      // Fallback for local testing
      local: 'http://localhost:8888'
    };

    // Current API URL - Netlify Functions use relative paths
    if (this.isNetlify || !this.isDevelopment) {
      this.baseURL = window.location.origin;
    } else {
      this.baseURL = this.API_URLS.development;
    }

    console.log('🔧 API Mode:', this.isDevelopment ? 'Development' : 'Production');
    console.log('📡 API Base URL:', this.baseURL);
    console.log('🚀 Platform:', this.isNetlify ? 'Netlify Serverless' : 'Local');
  }

  // Get the appropriate API URL for the environment
  getAPIUrl(endpoint = '') {
    // For Netlify, use relative paths that get redirected to functions
    if (this.isNetlify || !this.isDevelopment) {
      return `/api${endpoint}`;
    }
    // For local development with Netlify dev
    return `${this.baseURL}/.netlify/functions${endpoint.replace('/api/', '/')}`;
  }

  // Test API connectivity
  async testConnectivity() {
    try {
      console.log('🧪 Testing Netlify Functions connectivity...');

      const response = await fetch(this.getAPIUrl('/health'), {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        console.log('✅ Netlify Functions connectivity test successful:', data);
        return { success: true, data };
      } else {
        throw new Error(`HTTP ${response.status}`);
      }
    } catch (error) {
      console.error('❌ Netlify Functions connectivity test failed:', error);
      return { success: false, error: error.message };
    }
  }

  // Test stock API endpoint
  async testStockAPI() {
    try {
      console.log('🧪 Testing stock API endpoint...');

      const response = await fetch(this.getAPIUrl('/stock/PETR4'), {
        method: 'GET',
        headers: {
          'Accept': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        console.log('✅ Stock API test successful:', data);
        return { success: true, data };
      } else {
        throw new Error(`HTTP ${response.status}`);
      }
    } catch (error) {
      console.error('❌ Stock API test failed:', error);
      return { success: false, error: error.message };
    }
  }

  // Get platform info
  getPlatformInfo() {
    return {
      platform: this.isNetlify ? 'Netlify' : 'Local',
      environment: this.isDevelopment ? 'Development' : 'Production',
      baseURL: this.baseURL,
      hostname: window.location.hostname,
      port: window.location.port,
      isNetlify: this.isNetlify,
      isDevelopment: this.isDevelopment
    };
  }
}

// Create and export singleton instance
const apiConfig = new APIConfig();
export default apiConfig;