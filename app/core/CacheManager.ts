import redisService from './RedisService';

interface CacheOptions {
  ttl?: number; // Time to live in seconds
  prefix?: string;
}

class CacheManager {
  private defaultTTL: number = 3600; // 1 hour
  private prefix: string = 'nodeflow:';

  async get<T>(key: string): Promise<T | null> {
    const fullKey = `${this.prefix}${key}`;
    const data = await redisService.get(fullKey);
    
    if (!data) return null;
    
    try {
      return JSON.parse(data) as T;
    } catch (error) {
      console.error(`Error parsing cache data for key ${key}:`, error);
      return null;
    }
  }

  async set<T>(key: string, value: T, options?: CacheOptions): Promise<boolean> {
    const fullKey = `${this.prefix}${key}`;
    const ttl = options?.ttl || this.defaultTTL;
    
    try {
      const stringValue = JSON.stringify(value);
      return await redisService.set(fullKey, stringValue, ttl);
    } catch (error) {
      console.error(`Error setting cache for key ${key}:`, error);
      return false;
    }
  }

  async delete(key: string): Promise<boolean> {
    const fullKey = `${this.prefix}${key}`;
    return await redisService.del(fullKey);
  }

  async has(key: string): Promise<boolean> {
    const fullKey = `${this.prefix}${key}`;
    return await redisService.exists(fullKey);
  }

  async remember<T>(key: string, ttl: number, callback: () => Promise<T>): Promise<T> {
    const cached = await this.get<T>(key);
    
    if (cached !== null) {
      return cached;
    }
    
    const value = await callback();
    await this.set(key, value, { ttl });
    
    return value;
  }

  async flush(prefix?: string): Promise<void> {
    // Note: This requires SCAN command which is not implemented yet
    // For now, we'll just log a warning
    console.warn('Cache flush not fully implemented. Use specific delete operations.');
  }

  async increment(key: string, amount: number = 1): Promise<number | null> {
    const fullKey = `${this.prefix}${key}`;
    
    if (!redisService.isConnected()) return null;
    
    try {
      const client = redisService.getClient();
      if (!client) return null;
      
      const newValue = await client.incrBy(fullKey, amount);
      return newValue;
    } catch (error) {
      console.error(`Error incrementing key ${key}:`, error);
      return null;
    }
  }

  async decrement(key: string, amount: number = 1): Promise<number | null> {
    const fullKey = `${this.prefix}${key}`;
    
    if (!redisService.isConnected()) return null;
    
    try {
      const client = redisService.getClient();
      if (!client) return null;
      
      const newValue = await client.decrBy(fullKey, amount);
      return newValue;
    } catch (error) {
      console.error(`Error decrementing key ${key}:`, error);
      return null;
    }
  }
}

export default new CacheManager();
