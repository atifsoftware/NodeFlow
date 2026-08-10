const fs = require('fs');
const path = require('path');

/**
 * NodeFlow Hybrid Caching System
 * Supports both Redis (high-performance) and File-based (fallback) caching.
 * Automatically uses Redis if available, otherwise falls back to file-based cache.
 */
class Cache {
  /**
   * Cache storage directory (relative to project root)
   * @type {string}
   */
  static cacheDir = path.join(__dirname, '..', '..', 'storage', 'cache');

  /**
   * Default TTL in seconds (1 hour)
   * @type {number}
   */
  static defaultTtl = 3600;

  /**
   * Redis service instance (lazy loaded)
   * @type {any}
   */
  static _redisService = null;

  /**
   * Check if Redis is available
   * @returns {Promise<boolean>}
   */
  static async isRedisAvailable() {
    try {
      if (!this._redisService) {
        // Try to load RedisService dynamically
        try {
          const redisModule = require('./RedisService');
          this._redisService = redisModule.default || redisModule;
        } catch (e) {
          return false;
        }
      }
      return this._redisService && this._redisService.isConnected();
    } catch (e) {
      return false;
    }
  }

  /**
   * Ensure cache directory exists
   */
  static init() {
    if (!fs.existsSync(this.cacheDir)) {
      fs.mkdirSync(this.cacheDir, { recursive: true });
    }
  }

  /**
   * Get the file path for a cache key
   * @param {string} key
   * @returns {string}
   */
  static _getFilePath(key) {
    // Simple hash using Node built-in crypto
    const crypto = require('crypto');
    const hash = crypto.createHash('md5').update(key).digest('hex');
    return path.join(this.cacheDir, `${hash}.cache.json`);
  }

  /**
   * Check if a cache file is valid (exists and not expired)
   * @param {string} filePath
   * @returns {boolean}
   */
  static _isValid(filePath) {
    if (!fs.existsSync(filePath)) return false;

    try {
      const content = fs.readFileSync(filePath, 'utf8');
      const data = JSON.parse(content);
      return data && data.expires && Date.now() < data.expires;
    } catch {
      return false;
    }
  }

  /**
   * Get a cached value by key
   * @param {string} key
   * @param {*} [defaultValue=null] - Value to return if cache miss
   * @returns {Promise<*>}
   */
  static async get(key, defaultValue = null) {
    // Try Redis first
    const redisAvailable = await this.isRedisAvailable();
    if (redisAvailable) {
      try {
        const data = await this._redisService.get(`nodeflow:${key}`);
        if (data !== null) {
          return JSON.parse(data);
        }
      } catch (e) {
        // Fall through to file cache
      }
    }

    // Fallback to file-based cache
    this.init();
    const filePath = this._getFilePath(key);

    if (!this._isValid(filePath)) {
      return defaultValue;
    }

    try {
      const content = fs.readFileSync(filePath, 'utf8');
      const data = JSON.parse(content);
      return data.value !== undefined ? data.value : defaultValue;
    } catch {
      return defaultValue;
    }
  }

  /**
   * Store a value in cache
   * @param {string} key
   * @param {*} value
   * @param {number} [ttl] - Time-to-live in seconds (defaults to 3600)
   * @returns {Promise<boolean>}
   */
  static async set(key, value, ttl) {
    ttl = ttl || this.defaultTtl;
    
    // Try Redis first
    const redisAvailable = await this.isRedisAvailable();
    if (redisAvailable) {
      try {
        const stringValue = JSON.stringify(value);
        return await this._redisService.set(`nodeflow:${key}`, stringValue, ttl);
      } catch (e) {
        // Fall through to file cache
      }
    }

    // Fallback to file-based cache
    this.init();
    const filePath = this._getFilePath(key);

    const data = {
      key,
      value,
      expires: Date.now() + (ttl * 1000),
      created: Date.now()
    };

    try {
      fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf8');
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Check if a cache key exists and is valid
   * @param {string} key
   * @returns {Promise<boolean>}
   */
  static async has(key) {
    const redisAvailable = await this.isRedisAvailable();
    if (redisAvailable) {
      try {
        return await this._redisService.exists(`nodeflow:${key}`);
      } catch (e) {
        // Fall through to file cache
      }
    }

    // Fallback to file-based cache
    this.init();
    const filePath = this._getFilePath(key);
    return this._isValid(filePath);
  }

  /**
   * Delete a cache entry
   * @param {string} key
   * @returns {Promise<boolean>}
   */
  static async delete(key) {
    let deleted = false;

    // Try Redis first
    const redisAvailable = await this.isRedisAvailable();
    if (redisAvailable) {
      try {
        deleted = await this._redisService.del(`nodeflow:${key}`);
      } catch (e) {
        // Continue to file cache
      }
    }

    // Also delete from file cache
    const filePath = this._getFilePath(key);
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
      deleted = true;
    }

    return deleted;
  }

  /**
   * Clear all cached data
   * @returns {Promise<number>} Number of files removed
   */
  static async clear() {
    let count = 0;

    // Note: Redis flush requires SCAN which is not implemented yet
    // For now, we only clear file cache
    
    this.init();
    try {
      const files = fs.readdirSync(this.cacheDir);
      for (const file of files) {
        if (file.endsWith('.cache.json')) {
          fs.unlinkSync(path.join(this.cacheDir, file));
          count++;
        }
      }
    } catch {
      // Directory might not exist
    }

    return count;
  }

  /**
   * Get or create cache entry.
   * If cache hit, returns stored value.
   * If cache miss, executes callback, stores result, and returns it.
   * @param {string} key
   * @param {number} ttl - TTL in seconds
   * @param {Function} callback - Async or sync function to generate value on cache miss
   * @returns {Promise<*>}
   */
  static async remember(key, ttl, callback) {
    const cached = await this.get(key);
    if (cached !== null) {
      return cached;
    }

    const value = await callback();
    await this.set(key, value, ttl);
    return value;
  }

  /**
   * Clean expired cache entries
   * @returns {Promise<number>} Number of expired files removed
   */
  static async clean() {
    this.init();
    let cleaned = 0;

    try {
      const files = fs.readdirSync(this.cacheDir);
      for (const file of files) {
        if (file.endsWith('.cache.json')) {
          const filePath = path.join(this.cacheDir, file);
          if (!this._isValid(filePath)) {
            fs.unlinkSync(filePath);
            cleaned++;
          }
        }
      }
    } catch {
      // Ignore errors
    }

    return cleaned;
  }

  /**
   * Get cache statistics
   * @returns {Promise<object>} Stats including total files, total size, and expired count
   */
  static async stats() {
    this.init();
    let totalFiles = 0;
    let totalSize = 0;
    let validCount = 0;
    let expiredCount = 0;

    try {
      const files = fs.readdirSync(this.cacheDir);
      for (const file of files) {
        if (file.endsWith('.cache.json')) {
          totalFiles++;
          const filePath = path.join(this.cacheDir, file);
          const stat = fs.statSync(filePath);
          totalSize += stat.size;

          if (this._isValid(filePath)) {
            validCount++;
          } else {
            expiredCount++;
          }
        }
      }
    } catch {
      // Ignore
    }

    return { totalFiles, totalSize, validCount, expiredCount };
  }
}

module.exports = Cache;
