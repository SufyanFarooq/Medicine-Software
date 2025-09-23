// Performance optimization - API Response Caching System
class APICache {
  constructor() {
    this.cache = new Map();
    this.defaultTTL = 5 * 60 * 1000; // 5 minutes default
  }

  // Generate cache key from URL and params
  generateKey(url, params = {}) {
    const sortedParams = Object.keys(params)
      .sort()
      .reduce((result, key) => {
        result[key] = params[key];
        return result;
      }, {});
    
    return `${url}?${JSON.stringify(sortedParams)}`;
  }

  // Get cached data
  get(key) {
    const cached = this.cache.get(key);
    if (!cached) return null;

    // Check if expired
    if (Date.now() > cached.expiry) {
      this.cache.delete(key);
      return null;
    }

    console.log(`🎯 Cache HIT for: ${key}`);
    return cached.data;
  }

  // Set cached data
  set(key, data, ttl = this.defaultTTL) {
    const expiry = Date.now() + ttl;
    this.cache.set(key, { data, expiry });
    console.log(`💾 Cache SET for: ${key} (TTL: ${ttl}ms)`);
  }

  // Clear specific cache
  delete(key) {
    this.cache.delete(key);
    console.log(`🗑️ Cache DELETED for: ${key}`);
  }

  // Clear all cache
  clear() {
    this.cache.clear();
    console.log('🧹 All cache cleared');
  }

  // Get cache stats
  getStats() {
    return {
      size: this.cache.size,
      keys: Array.from(this.cache.keys())
    };
  }

  // Clean expired entries
  cleanExpired() {
    const now = Date.now();
    for (const [key, value] of this.cache.entries()) {
      if (now > value.expiry) {
        this.cache.delete(key);
      }
    }
  }
}

// Global cache instance
const apiCache = new APICache();

// Cache middleware for API requests
export const withCache = (handler, options = {}) => {
  const { ttl = 5 * 60 * 1000, keyGenerator } = options;

  return async (req, res) => {
    // Generate cache key
    const cacheKey = keyGenerator 
      ? keyGenerator(req) 
      : apiCache.generateKey(req.url, req.query);

    // Try to get from cache
    const cachedResponse = apiCache.get(cacheKey);
    if (cachedResponse) {
      return res.status(200).json(cachedResponse);
    }

    // Store original res.json
    const originalJson = res.json;
    const responseData = {};

    // Override res.json to capture response
    res.json = function(data) {
      responseData.data = data;
      responseData.status = res.statusCode;
      
      // Cache successful responses
      if (res.statusCode === 200) {
        apiCache.set(cacheKey, data, ttl);
      }
      
      return originalJson.call(this, data);
    };

    // Call original handler
    await handler(req, res);
  };
};

// Cache configuration for different endpoints
export const cacheConfig = {
  // Settings - cache for 10 minutes
  '/api/settings': { ttl: 10 * 60 * 1000 },
  
  // Products - cache for 5 minutes
  '/api/products': { ttl: 5 * 60 * 1000 },
  
  // Categories - cache for 15 minutes
  '/api/categories': { ttl: 15 * 60 * 1000 },
  
  // Customers - cache for 3 minutes
  '/api/customers': { ttl: 3 * 60 * 1000 },
  
  // Notifications - cache for 2 minutes
  '/api/notifications': { ttl: 2 * 60 * 1000 },
  
  // Reports - cache for 1 minute
  '/api/reports': { ttl: 1 * 60 * 1000 },
  
  // Activities - cache for 1 minute
  '/api/activities': { ttl: 1 * 60 * 1000 }
};

// Helper function to get cache TTL for endpoint
export const getCacheTTL = (endpoint) => {
  return cacheConfig[endpoint]?.ttl || 5 * 60 * 1000;
};

// Helper function to clear cache for specific endpoint
export const clearEndpointCache = (endpoint) => {
  const stats = apiCache.getStats();
  const keysToDelete = stats.keys.filter(key => key.includes(endpoint));
  
  keysToDelete.forEach(key => {
    apiCache.delete(key);
  });
  
  console.log(`🧹 Cleared ${keysToDelete.length} cache entries for ${endpoint}`);
};

// Auto-clean expired entries every 5 minutes
setInterval(() => {
  apiCache.cleanExpired();
  console.log('🧹 Auto-cleaned expired cache entries');
}, 5 * 60 * 1000);

export default apiCache;
