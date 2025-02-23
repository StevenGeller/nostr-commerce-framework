import { SimplePool } from 'nostr-tools';
export interface ConnectionPoolConfig {
    maxConnections: number;
    connectionTimeout: number;
    reconnectInterval: number;
    maxRetries: number;
}
export interface CacheConfig {
    maxSize: number;
    ttl: number;
}
export declare class ConnectionPool {
    private config;
    private pools;
    private connectionStatus;
    private retryAttempts;
    private cache;
    constructor(config: ConnectionPoolConfig, cacheConfig: CacheConfig);
    /**
     * Get or create a connection pool for a relay
     */
    getPool(relay: string): Promise<SimplePool>;
    /**
     * Connect to a relay with timeout and retry logic
     */
    private connectToRelay;
    /**
     * Monitor and maintain connections
     */
    private monitorConnections;
    /**
     * Cache management methods
     */
    setCache(key: string, value: any): void;
    getCache<T>(key: string): T | undefined;
    hasCache(key: string): boolean;
    invalidateCache(key: string): void;
    clearCache(): void;
    /**
     * Clean up resources
     */
    close(): Promise<void>;
}
