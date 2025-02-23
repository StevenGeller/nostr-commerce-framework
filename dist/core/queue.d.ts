import { EventEmitter } from 'events';
export interface QueueConfig {
    maxSize: number;
    processingTimeout: number;
    retryAttempts: number;
    retryDelay: number;
}
export interface QueuedMessage {
    id: string;
    data: any;
    priority: number;
    timestamp: number;
    attempts: number;
}
export declare class MessageQueue extends EventEmitter {
    private config;
    private queue;
    private processing;
    private handlers;
    constructor(config: QueueConfig);
    /**
     * Register a message handler for a specific type
     */
    registerHandler(type: string, handler: (data: any) => Promise<void>): void;
    /**
     * Add a message to the queue
     */
    enqueue(type: string, data: any, priority?: number): Promise<string>;
    /**
     * Sort queue by priority (highest first)
     */
    private sortQueue;
    /**
     * Process messages in the queue
     */
    private processQueue;
    /**
     * Get current queue status
     */
    getStatus(): {
        size: number;
        processing: boolean;
        oldestMessage?: number;
    };
    /**
     * Clear the queue
     */
    clear(): void;
}
