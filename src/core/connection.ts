import { SimplePool } from 'nostr-tools';
import { NostrError, ErrorCode } from './errors';
import { logger } from './logging';
import LRU from 'lru-cache';

export interface ConnectionPoolConfig {
  maxConnections: number;
  connectionTimeout: number;
  reconnectInterval: number;
  maxRetries: number;
}

export interface CacheConfig {
  maxSize: number;
  ttl: number; // Time to live in milliseconds
}

export class ConnectionPool {
  private pools: Map<string, SimplePool> = new Map();
  private connectionStatus: Map<string, boolean> = new Map();
  private retryAttempts: Map<string, number> = new Map();
  private cache: LRU<string, any>;

  constructor(
    private config: ConnectionPoolConfig,
    cacheConfig: CacheConfig
  ) {
    this.cache = new LRU({
      max: cacheConfig.maxSize,
      ttl: cacheConfig.ttl,
      updateAgeOnGet: true,
      updateAgeOnHas: true
    });

    // Start monitoring connections
    setInterval(() => this.monitorConnections(), this.config.reconnectInterval);
  }

  /**
   * Get or create a connection pool for a relay
   */
  async getPool(relay: string): Promise<SimplePool> {
    let pool = this.pools.get(relay);
    
    if (!pool) {
      if (this.pools.size >= this.config.maxConnections) {
        throw new NostrError(
          ErrorCode.CONNECTION_LIMIT_EXCEEDED,
          'Maximum number of connections reached'
        );
      }

      pool = new SimplePool();
      this.pools.set(relay, pool);
      
      try {
        await this.connectToRelay(relay, pool);
      } catch (error) {
        this.pools.delete(relay);
        throw error;
      }
    }

    return pool;
  }

  /**
   * Connect to a relay with timeout and retry logic
   */
  private async connectToRelay(relay: string, pool: SimplePool): Promise<void> {
    const attempts = this.retryAttempts.get(relay) || 0;
    
    if (attempts >= this.config.maxRetries) {
      throw new NostrError(
        ErrorCode.RELAY_CONNECTION_FAILED,
        'Maximum retry attempts reached',
        { relay, attempts }
      );
    }

    try {
      const connectPromise = pool.ensureRelay(relay);
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => {
          reject(new NostrError(
            ErrorCode.RELAY_TIMEOUT,
            'Connection timeout',
            { relay, timeout: this.config.connectionTimeout }
          ));
        }, this.config.connectionTimeout);
      });

      await Promise.race([connectPromise, timeoutPromise]);
      
      this.connectionStatus.set(relay, true);
      this.retryAttempts.set(relay, 0);
      
      logger.info('Successfully connected to relay', { relay });
    } catch (error) {
      this.connectionStatus.set(relay, false);
      this.retryAttempts.set(relay, attempts + 1);
      
      logger.error('Failed to connect to relay', {
        relay,
        error,
        attempts: attempts + 1
      });
      
      throw error;
    }
  }

  /**
   * Monitor and maintain connections
   */
  private async monitorConnections(): Promise<void> {
    for (const [relay, pool] of this.pools.entries()) {
      const isConnected = this.connectionStatus.get(relay);
      
      if (!isConnected) {
        try {
          await this.connectToRelay(relay, pool);
        } catch (error) {
          logger.warn('Failed to reconnect to relay', { relay, error });
        }
      }
    }
  }

  /**
   * Cache management methods
   */
  setCache(key: string, value: any): void {
    this.cache.set(key, value);
  }

  getCache<T>(key: string): T | undefined {
    return this.cache.get(key) as T;
  }

  hasCache(key: string): boolean {
    return this.cache.has(key);
  }

  invalidateCache(key: string): void {
    this.cache.delete(key);
  }

  clearCache(): void {
    this.cache.clear();
  }

  /**
   * Clean up resources
   */
  async close(): Promise<void> {
    for (const [relay, pool] of this.pools.entries()) {
      try {
        pool.close([relay]);
        this.pools.delete(relay);
        this.connectionStatus.delete(relay);
        this.retryAttempts.delete(relay);
      } catch (error) {
        logger.error('Error closing connection', { relay, error });
      }
    }
  }
}