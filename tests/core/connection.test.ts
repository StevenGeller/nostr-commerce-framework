import { ConnectionPool, ConnectionPoolConfig, CacheConfig } from '../../src/core/connection';
import { NostrError, ErrorCode } from '../../src/core/errors';
import { mockPool } from '../mocks/nostr-tools';

jest.mock('nostr-tools', () => ({
  SimplePool: jest.fn().mockImplementation(() => mockPool)
}));

describe('Connection Pool Tests', () => {
  let pool: ConnectionPool;
  const config: ConnectionPoolConfig = {
    maxConnections: 3,
    connectionTimeout: 1000,
    reconnectInterval: 1000,
    maxRetries: 3
  };
  const cacheConfig: CacheConfig = {
    maxSize: 1000,
    ttl: 3600000 // 1 hour
  };

  beforeEach(() => {
    jest.clearAllMocks();
    pool = new ConnectionPool(config, cacheConfig);
  });

  afterEach(async () => {
    await pool.close();
  });

  describe('Connection Management', () => {
    it('should create new pool for relay', async () => {
      const relay = 'wss://test.relay';
      const result = await pool.getPool(relay);
      
      expect(result).toBeDefined();
      expect(mockPool.ensureRelay).toHaveBeenCalledWith(relay);
    });

    it('should reuse existing pool', async () => {
      const relay = 'wss://test.relay';
      const pool1 = await pool.getPool(relay);
      const pool2 = await pool.getPool(relay);
      
      expect(pool1).toBe(pool2);
      expect(mockPool.ensureRelay).toHaveBeenCalledTimes(1);
    });

    it('should handle connection failures', async () => {
      mockPool.ensureRelay.mockRejectedValueOnce(
        new NostrError(
          ErrorCode.RELAY_CONNECTION_FAILED,
          'Connection failed'
        )
      );
      
      const relay = 'wss://test.relay';
      await expect(pool.getPool(relay)).rejects.toThrow(NostrError);
    });

    it('should enforce connection limit', async () => {
      const relays = [
        'wss://relay1.test',
        'wss://relay2.test',
        'wss://relay3.test',
        'wss://relay4.test'
      ];

      await Promise.all(relays.slice(0, 3).map(relay => pool.getPool(relay)));
      await expect(pool.getPool(relays[3])).rejects.toThrow(NostrError);
    });
  });

  describe('Cache Management', () => {
    it('should store and retrieve cached values', () => {
      const key = 'test-key';
      const value = { data: 'test-data' };
      
      pool.setCache(key, value);
      expect(pool.getCache(key)).toEqual(value);
    });

    it('should handle cache misses', () => {
      expect(pool.getCache('non-existent')).toBeUndefined();
    });

    it('should check cache existence', () => {
      const key = 'test-key';
      
      expect(pool.hasCache(key)).toBe(false);
      pool.setCache(key, 'value');
      expect(pool.hasCache(key)).toBe(true);
    });

    it('should invalidate cache entries', () => {
      const key = 'test-key';
      pool.setCache(key, 'value');
      pool.invalidateCache(key);
      
      expect(pool.hasCache(key)).toBe(false);
    });

    it('should clear entire cache', () => {
      pool.setCache('key1', 'value1');
      pool.setCache('key2', 'value2');
      pool.clearCache();
      
      expect(pool.hasCache('key1')).toBe(false);
      expect(pool.hasCache('key2')).toBe(false);
    });
  });

  describe('Connection Monitoring', () => {
    it('should attempt reconnection on failure', async () => {
      const relay = 'wss://test.relay';
      mockPool.ensureRelay
        .mockRejectedValueOnce(
          new NostrError(
            ErrorCode.RELAY_CONNECTION_FAILED,
            'Connection failed'
          )
        )
        .mockResolvedValueOnce(undefined);

      await expect(pool.getPool(relay)).rejects.toThrow(NostrError);
      
      // Wait for reconnect interval
      await new Promise(resolve => setTimeout(resolve, config.reconnectInterval));
      
      const result = await pool.getPool(relay);
      expect(result).toBeDefined();
      expect(mockPool.ensureRelay).toHaveBeenCalledTimes(2);
    }, 10000);

    it('should stop retrying after max attempts', async () => {
      const relay = 'wss://test.relay';
      mockPool.ensureRelay.mockRejectedValue(
        new NostrError(
          ErrorCode.RELAY_CONNECTION_FAILED,
          'Connection failed'
        )
      );

      for (let i = 0; i < config.maxRetries; i++) {
        await expect(pool.getPool(relay)).rejects.toThrow(NostrError);
      }

      expect(mockPool.ensureRelay).toHaveBeenCalledTimes(config.maxRetries);
    });
  });
});