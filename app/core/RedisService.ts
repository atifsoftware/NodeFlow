import { createClient, RedisClientType } from 'redis';

class RedisService {
  private client: RedisClientType | null = null;
  private connected: boolean = false;

  async connect(): Promise<void> {
    try {
      const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';
      
      this.client = createClient({
        url: redisUrl,
      });

      this.client.on('error', (err) => {
        console.error('Redis Client Error:', err);
        this.connected = false;
      });

      this.client.on('connect', () => {
        console.log('✅ Redis Connected Successfully');
        this.connected = true;
      });

      await this.client.connect();
    } catch (error) {
      console.warn('⚠️  Redis connection failed. Running without cache.');
      this.connected = false;
    }
  }

  async disconnect(): Promise<void> {
    if (this.client && this.connected) {
      await this.client.quit();
      this.connected = false;
      console.log('Redis disconnected');
    }
  }

  async get(key: string): Promise<string | null> {
    if (!this.client || !this.connected) return null;
    try {
      return await this.client.get(key);
    } catch (error) {
      console.error(`Error getting key ${key}:`, error);
      return null;
    }
  }

  async set(key: string, value: string, expireSeconds?: number): Promise<boolean> {
    if (!this.client || !this.connected) return false;
    try {
      if (expireSeconds) {
        await this.client.setEx(key, expireSeconds, value);
      } else {
        await this.client.set(key, value);
      }
      return true;
    } catch (error) {
      console.error(`Error setting key ${key}:`, error);
      return false;
    }
  }

  async del(key: string): Promise<boolean> {
    if (!this.client || !this.connected) return false;
    try {
      await this.client.del(key);
      return true;
    } catch (error) {
      console.error(`Error deleting key ${key}:`, error);
      return false;
    }
  }

  async exists(key: string): Promise<boolean> {
    if (!this.client || !this.connected) return false;
    try {
      const result = await this.client.exists(key);
      return result === 1;
    } catch (error) {
      console.error(`Error checking key ${key}:`, error);
      return false;
    }
  }

  async hGetAll(key: string): Promise<Record<string, string> | null> {
    if (!this.client || !this.connected) return null;
    try {
      return await this.client.hGetAll(key);
    } catch (error) {
      console.error(`Error getting hash ${key}:`, error);
      return null;
    }
  }

  async hSet(key: string, field: string, value: string): Promise<boolean> {
    if (!this.client || !this.connected) return false;
    try {
      await this.client.hSet(key, field, value);
      return true;
    } catch (error) {
      console.error(`Error setting hash ${key}:`, error);
      return false;
    }
  }

  async lPush(key: string, value: string): Promise<number> {
    if (!this.client || !this.connected) return 0;
    try {
      return await this.client.lPush(key, value);
    } catch (error) {
      console.error(`Error pushing to list ${key}:`, error);
      return 0;
    }
  }

  async rPop(key: string): Promise<string | null> {
    if (!this.client || !this.connected) return null;
    try {
      return await this.client.rPop(key);
    } catch (error) {
      console.error(`Error popping from list ${key}:`, error);
      return null;
    }
  }

  isConnected(): boolean {
    return this.connected && this.client !== null;
  }

  getClient(): RedisClientType | null {
    return this.client;
  }
}

export default new RedisService();
