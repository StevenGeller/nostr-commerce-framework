import { EventEmitter } from 'events';
import { NostrError, ErrorCode } from './errors';
import { logger } from './logging';

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

export class MessageQueue extends EventEmitter {
  private queue: QueuedMessage[] = [];
  private processing: boolean = false;
  private handlers: Map<string, (data: any) => Promise<void>> = new Map();

  constructor(private config: QueueConfig) {
    super();
  }

  /**
   * Register a message handler for a specific type
   */
  registerHandler(type: string, handler: (data: any) => Promise<void>): void {
    this.handlers.set(type, handler);
  }

  /**
   * Add a message to the queue
   */
  async enqueue(type: string, data: any, priority: number = 0): Promise<string> {
    if (!this.handlers.has(type)) {
      throw new NostrError(
        ErrorCode.INVALID_MESSAGE_TYPE,
        'No handler registered for message type',
        { type }
      );
    }

    if (this.queue.length >= this.config.maxSize) {
      throw new NostrError(
        ErrorCode.QUEUE_FULL,
        'Message queue is full',
        { queueSize: this.queue.length }
      );
    }

    const message: QueuedMessage = {
      id: Math.random().toString(36).substring(7),
      data: { type, payload: data },
      priority,
      timestamp: Date.now(),
      attempts: 0
    };

    this.queue.push(message);
    this.queue.sort((a, b) => b.priority - a.priority);

    logger.debug('Message enqueued', { 
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
   * Process messages in the queue
   */
  private async processQueue(): Promise<void> {
    if (this.processing || this.queue.length === 0) return;

    this.processing = true;

    try {
      while (this.queue.length > 0) {
        const message = this.queue[0];
        const handler = this.handlers.get(message.data.type);

        if (!handler) {
          this.queue.shift(); // Remove message if no handler exists
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

          logger.debug('Message processed successfully', { 
            messageId: message.id
          });
        } catch (error) {
          message.attempts++;

          if (message.attempts >= this.config.retryAttempts) {
            // Max retries reached, remove message
            this.queue.shift();
            this.emit('messageFailed', message.id, error);
            
            logger.error('Message processing failed permanently', {
              messageId: message.id,
              error,
              attempts: message.attempts
            });
          } else {
            // Move to end of queue for retry
            this.queue.shift();
            this.queue.push(message);
            
            logger.warn('Message processing failed, will retry', {
              messageId: message.id,
              error,
              attempts: message.attempts
            });

            // Wait before next attempt
            await new Promise(resolve => 
              setTimeout(resolve, this.config.retryDelay)
            );
          }
        }
      }
    } finally {
      this.processing = false;
    }
  }

  /**
   * Get current queue status
   */
  getStatus(): {
    size: number;
    processing: boolean;
    oldestMessage?: number;
  } {
    return {
      size: this.queue.length,
      processing: this.processing,
      oldestMessage: this.queue[0]?.timestamp
    };
  }

  /**
   * Clear the queue
   */
  clear(): void {
    this.queue = [];
    this.processing = false;
    logger.info('Message queue cleared');
  }
}