"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MessageQueue = void 0;
const events_1 = require("events");
const errors_1 = require("./errors");
const logging_1 = require("./logging");
class MessageQueue extends events_1.EventEmitter {
    constructor(config) {
        super();
        this.config = config;
        this.queue = [];
        this.processing = false;
        this.handlers = new Map();
    }
    /**
     * Register a message handler for a specific type
     */
    registerHandler(type, handler) {
        this.handlers.set(type, handler);
    }
    /**
     * Add a message to the queue
     */
    async enqueue(type, data, priority = 0) {
        if (!this.handlers.has(type)) {
            throw new errors_1.NostrError(errors_1.ErrorCode.INVALID_MESSAGE_TYPE, 'No handler registered for message type', { type });
        }
        if (this.queue.length >= this.config.maxSize) {
            throw new errors_1.NostrError(errors_1.ErrorCode.QUEUE_FULL, 'Message queue is full', { queueSize: this.queue.length });
        }
        const message = {
            id: Math.random().toString(36).substring(7),
            data: { type, payload: data },
            priority,
            timestamp: Date.now(),
            attempts: 0
        };
        this.queue.push(message);
        this.sortQueue();
        logging_1.logger.debug('Message enqueued', {
            messageId: message.id,
            type,
            priority
        });
        // Start processing if not already running
        if (!this.processing) {
            this.processQueue();
        }
        return message.id;
    }
    /**
     * Sort queue by priority (highest first)
     */
    sortQueue() {
        this.queue.sort((a, b) => b.priority - a.priority);
    }
    /**
     * Process messages in the queue
     */
    async processQueue() {
        if (this.processing || this.queue.length === 0)
            return;
        this.processing = true;
        try {
            while (this.queue.length > 0) {
                const message = this.queue[0];
                const handler = this.handlers.get(message.data.type);
                if (!handler) {
                    this.queue.shift();
                    continue;
                }
                try {
                    await Promise.race([
                        handler(message.data.payload),
                        new Promise((_, reject) => {
                            setTimeout(() => {
                                reject(new Error('Processing timeout'));
                            }, this.config.processingTimeout);
                        })
                    ]);
                    // Message processed successfully
                    this.queue.shift();
                    this.emit('messageProcessed', message.id);
                    logging_1.logger.debug('Message processed successfully', {
                        messageId: message.id
                    });
                }
                catch (error) {
                    message.attempts++;
                    if (message.attempts >= this.config.retryAttempts) {
                        // Max retries reached, remove message
                        this.queue.shift();
                        this.emit('messageFailed', message.id, error);
                        logging_1.logger.error('Message processing failed permanently', {
                            messageId: message.id,
                            error,
                            attempts: message.attempts
                        });
                    }
                    else {
                        // Move to end of queue for retry
                        this.queue.shift();
                        this.queue.push(message);
                        this.sortQueue();
                        logging_1.logger.warn('Message processing failed, will retry', {
                            messageId: message.id,
                            error,
                            attempts: message.attempts
                        });
                        // Wait before next attempt
                        await new Promise(resolve => setTimeout(resolve, this.config.retryDelay));
                    }
                }
            }
        }
        finally {
            this.processing = false;
        }
    }
    /**
     * Get current queue status
     */
    getStatus() {
        return {
            size: this.queue.length,
            processing: this.processing,
            oldestMessage: this.queue[0]?.timestamp
        };
    }
    /**
     * Clear the queue
     */
    clear() {
        this.queue = [];
        this.processing = false;
        logging_1.logger.info('Message queue cleared');
    }
}
exports.MessageQueue = MessageQueue;
