"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ConnectionPool = void 0;
const nostr_tools_1 = require("nostr-tools");
const errors_1 = require("./errors");
const logging_1 = require("./logging");
const lru_cache_1 = require("lru-cache");
class ConnectionPool {
    constructor(config, cacheConfig) {
        this.config = config;
        this.pools = new Map();
        this.connectionStatus = new Map();
        this.retryAttempts = new Map();
        this.cache = new lru_cache_1.LRUCache({
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
    async getPool(relay) {
        let pool = this.pools.get(relay);
        if (!pool) {
            if (this.pools.size >= this.config.maxConnections) {
                throw new errors_1.NostrError(errors_1.ErrorCode.CONNECTION_LIMIT_EXCEEDED, 'Maximum number of connections reached');
            }
            pool = new nostr_tools_1.SimplePool();
            this.pools.set(relay, pool);
            try {
                await this.connectToRelay(relay, pool);
            }
            catch (error) {
                this.pools.delete(relay);
                throw error;
            }
        }
        return pool;
    }
    /**
     * Connect to a relay with timeout and retry logic
     */
    async connectToRelay(relay, pool) {
        const attempts = this.retryAttempts.get(relay) || 0;
        if (attempts >= this.config.maxRetries) {
            throw new errors_1.NostrError(errors_1.ErrorCode.RELAY_CONNECTION_FAILED, 'Maximum retry attempts reached', { relay, attempts });
        }
        try {
            const connectPromise = pool.ensureRelay(relay);
            const timeoutPromise = new Promise((_, reject) => {
                setTimeout(() => {
                    reject(new errors_1.NostrError(errors_1.ErrorCode.RELAY_TIMEOUT, 'Connection timeout', { relay, timeout: this.config.connectionTimeout }));
                }, this.config.connectionTimeout);
            });
            await Promise.race([connectPromise, timeoutPromise]);
            this.connectionStatus.set(relay, true);
            this.retryAttempts.set(relay, 0);
            logging_1.logger.info('Successfully connected to relay', { relay });
        }
        catch (error) {
            this.connectionStatus.set(relay, false);
            this.retryAttempts.set(relay, attempts + 1);
            logging_1.logger.error('Failed to connect to relay', {
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
    async monitorConnections() {
        for (const [relay, pool] of this.pools.entries()) {
            const isConnected = this.connectionStatus.get(relay);
            if (!isConnected) {
                try {
                    await this.connectToRelay(relay, pool);
                }
                catch (error) {
                    logging_1.logger.warn('Failed to reconnect to relay', { relay, error });
                }
            }
        }
    }
    /**
     * Cache management methods
     */
    setCache(key, value) {
        this.cache.set(key, value);
    }
    getCache(key) {
        return this.cache.get(key);
    }
    hasCache(key) {
        return this.cache.has(key);
    }
    invalidateCache(key) {
        this.cache.delete(key);
    }
    clearCache() {
        this.cache.clear();
    }
    /**
     * Clean up resources
     */
    async close() {
        for (const [relay, pool] of this.pools.entries()) {
            try {
                pool.close([relay]);
                this.pools.delete(relay);
                this.connectionStatus.delete(relay);
                this.retryAttempts.delete(relay);
            }
            catch (error) {
                logging_1.logger.error('Error closing connection', { relay, error });
            }
        }
    }
}
exports.ConnectionPool = ConnectionPool;
