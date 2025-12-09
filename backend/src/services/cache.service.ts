import Redis, { RedisOptions } from 'ioredis';
import { logger } from '../utils/logger';

class CacheService {
  private redis: Redis | null = null;
  private isEnabled: boolean = false;
  private defaultTTL: number = 600; // 10 minutes in seconds

  constructor() {
    this.initialize();
  }

  /**
   * Initialize Redis connection
   */
  public initialize(): void {
    // Check if Redis is enabled in the environment
    if (process.env.USE_REDIS !== 'true') {
      logger.info('Redis caching is disabled. Set USE_REDIS=true to enable.');
      return;
    }

    try {
      const redisOptions: RedisOptions = {
        host: process.env.REDIS_HOST || 'localhost',
        port: parseInt(process.env.REDIS_PORT || '6379', 10),
        password: process.env.REDIS_PASSWORD || undefined,
        tls: process.env.REDIS_TLS_ENABLED === 'true' ? {} : undefined,
        retryStrategy: (times: number) => {
          // Reconnect after times * 100 ms, but max 3000 ms
          return Math.min(times * 100, 3000);
        }
      };

      // Support Redis URL if provided
      if (process.env.REDIS_URL) {
        this.redis = new Redis(process.env.REDIS_URL, redisOptions);
      } else {
        this.redis = new Redis(redisOptions);
      }

      this.redis.on('connect', () => {
        logger.info('Connected to Redis cache server');
        this.isEnabled = true;
      });

      this.redis.on('error', (err: Error) => {
        logger.error(`Redis connection error: ${err.message}`);
        this.isEnabled = false;
      });

    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : String(err);
      logger.error(`Failed to initialize Redis: ${errorMessage}`);
      this.isEnabled = false;
    }
  }

  /**
   * Set a value in the cache
   * @param key Cache key
   * @param value Data to cache (will be JSON stringified)
   * @param ttl Time to live in seconds (optional, defaults to 10 minutes)
   */
  public async set<T>(key: string, value: T, ttl: number = this.defaultTTL): Promise<void> {
    if (!this.redis || !this.isEnabled) return;

    try {
      const serialized = JSON.stringify(value);
      await this.redis.set(key, serialized, 'EX', ttl);
      logger.debug(`Cache set: ${key} (TTL: ${ttl}s)`);
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : String(err);
      logger.error(`Cache set error for key ${key}: ${errorMessage}`);
    }
  }

  /**
   * Get a value from the cache
   * @param key Cache key
   * @returns The cached value or null if not found
   */
  public async get<T>(key: string): Promise<T | null> {
    if (!this.redis || !this.isEnabled) return null;

    try {
      const data = await this.redis.get(key);
      if (!data) return null;

      logger.debug(`Cache hit: ${key}`);
      return JSON.parse(data) as T;
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : String(err);
      logger.error(`Cache get error for key ${key}: ${errorMessage}`);
      return null;
    }
  }

  /**
   * Delete a value from the cache
   * @param key Cache key
   */
  public async delete(key: string): Promise<void> {
    if (!this.redis || !this.isEnabled) return;

    try {
      await this.redis.del(key);
      logger.debug(`Cache delete: ${key}`);
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : String(err);
      logger.error(`Cache delete error for key ${key}: ${errorMessage}`);
    }
  }

  /**
   * Delete multiple values from the cache using a pattern
   * @param pattern Key pattern with wildcard (e.g., 'user:*')
   */
  public async deleteByPattern(pattern: string): Promise<void> {
    if (!this.redis || !this.isEnabled) return;

    try {
      // SCAN command to find keys matching the pattern
      let cursor = '0';
      do {
        const [nextCursor, keys] = await this.redis.scan(
          cursor,
          'MATCH',
          pattern,
          'COUNT',
          100
        );

        cursor = nextCursor;

        if (keys.length) {
          await this.redis.del(...keys);
          logger.debug(`Cache deleted ${keys.length} keys matching pattern: ${pattern}`);
        }
      } while (cursor !== '0');
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : String(err);
      logger.error(`Cache deleteByPattern error for pattern ${pattern}: ${errorMessage}`);
    }
  }

  /**
   * Check if a key exists in the cache
   * @param key Cache key
   * @returns boolean indicating if the key exists
   */
  public async exists(key: string): Promise<boolean> {
    if (!this.redis || !this.isEnabled) return false;

    try {
      const exists = await this.redis.exists(key);
      return exists === 1;
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : String(err);
      logger.error(`Cache exists error for key ${key}: ${errorMessage}`);
      return false;
    }
  }

  /**
   * Get or set cache value (convenience method)
   * @param key Cache key
   * @param fetchFn Function to call to get data if not in cache
   * @param ttl Time to live in seconds (optional)
   * @returns The cached or fetched value
   */
  public async getOrSet<T>(
    key: string,
    fetchFn: () => Promise<T>,
    ttl: number = this.defaultTTL
  ): Promise<T> {
    // Try to get from cache first
    const cached = await this.get<T>(key);
    if (cached !== null) {
      return cached;
    }

    // If not in cache or cache disabled, fetch fresh data
    const data = await fetchFn();

    // Cache the result if we got valid data
    if (data !== null && data !== undefined && this.isEnabled) {
      await this.set(key, data, ttl);
    }

    return data;
  }

  /**
   * Close the Redis connection
   */
  public async close(): Promise<void> {
    if (!this.redis) return;

    try {
      await this.redis.quit();
      this.isEnabled = false;
      logger.info('Redis connection closed');
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : String(err);
      logger.error(`Error closing Redis connection: ${errorMessage}`);
    }
  }

  /**
   * Check if caching is enabled
   */
  public isEnabledStatus(): boolean {
    return this.isEnabled;
  }
}

// Export a singleton instance
export default new CacheService();