import { EventEmitter } from 'events';
import { SimplePool, getEventHash, signEvent } from 'nostr-tools';
import { NostrError, ErrorCode } from './errors';
import { NostrEvent } from './types';
import { logger } from './logging';
import { eventValidator } from './validation';
import { ConnectionPool, ConnectionPoolConfig } from './connection';
import { MessageQueue, QueueConfig } from './queue';

export interface NostrConfig {
  relays: string[];
  publicKey: string;
  privateKey: string;
  connectionConfig?: ConnectionPoolConfig;
  queueConfig?: QueueConfig;
}

export class NostrCommerce extends EventEmitter {
  private pool: ConnectionPool;
  private queue: MessageQueue;
  private eventHandlers: Map<string, (event: NostrEvent) => void> = new Map();
  private pools: Map<string, SimplePool> = new Map();

  constructor(private config: NostrConfig) {
    super();
    
    this.pool = new ConnectionPool(
      config.connectionConfig || {
        maxConnections: 10,
        connectionTimeout: 5000,
        reconnectInterval: 30000,
        maxRetries: 3
      },
      {
        maxSize: 1000,
        ttl: 3600000 // 1 hour
      }
    );

    this.queue = new MessageQueue(
      config.queueConfig || {
        maxSize: 100,
        processingTimeout: 5000,
        retryAttempts: 3,
        retryDelay: 1000
      }
    );

    // Set up message handlers
    this.queue.registerHandler('publish', this.handlePublish.bind(this));
  }

  /**
   * Start the framework
   */
  async start(): Promise<void> {
    try {
      // Connect to all relays
      await Promise.all(
        this.config.relays.map(async (relay) => {
          const pool = await this.pool.getPool(relay);
          this.pools.set(relay, pool);
        })
      );

      logger.info('NostrCommerce framework started');
      this.emit('ready');
    } catch (error) {
      logger.error('Failed to start framework', { error });
      throw error;
    }
  }

  /**
   * Publish an event to the Nostr network
   */
  async publishEvent(event: Partial<NostrEvent>): Promise<string> {
    const finalEvent = {
      ...event,
      created_at: Math.floor(Date.now() / 1000),
      pubkey: this.config.publicKey,
      tags: event.tags || [],
      content: event.content || ''
    } as NostrEvent;

    // Validate event
    eventValidator.validate(finalEvent);

    // Sign event
    finalEvent.id = getEventHash(finalEvent);
    finalEvent.sig = await signEvent(finalEvent, this.config.privateKey);

    // Queue for publishing
    return await this.queue.enqueue('publish', finalEvent);
  }

  /**
   * Subscribe to events
   */
  subscribe(filters: any[], callback: (event: NostrEvent) => void): () => void {
    const subscriptionId = Math.random().toString(36).substring(7);
    this.eventHandlers.set(subscriptionId, callback);

    const unsubs = this.config.relays.map(relay => {
      const pool = this.pools.get(relay);
      if (!pool) {
        throw new NostrError(
          ErrorCode.RELAY_CONNECTION_FAILED,
          `Not connected to relay: ${relay}`
        );
      }

      const sub = pool.sub([relay], filters);
      sub.on('event', (event: NostrEvent) => {
        this.emit('event', event);
        callback(event);
      });
      return () => sub.unsub();
    });

    return () => {
      this.eventHandlers.delete(subscriptionId);
      unsubs.forEach(unsub => unsub());
    };
  }

  /**
   * Handle publishing events
   */
  private async handlePublish(event: NostrEvent): Promise<void> {
    try {
      const promises = this.config.relays.map(relay => {
        const pool = this.pools.get(relay);
        if (!pool) {
          throw new NostrError(
            ErrorCode.RELAY_CONNECTION_FAILED,
            `Not connected to relay: ${relay}`
          );
        }
        return pool.publish([relay], event);
      });

      await Promise.all(promises);
      this.emit('publish:success', { eventId: event.id });
      logger.debug('Event published successfully', { eventId: event.id });
    } catch (error) {
      this.emit('publish:error', { error, eventId: event.id });
      logger.error('Failed to publish event', { error, eventId: event.id });
      throw error;
    }
  }

  /**
   * Stop the framework
   */
  async stop(): Promise<void> {
    await this.pool.close();
    this.queue.clear();
    this.eventHandlers.clear();
    this.pools.clear();
    this.emit('stopped');
    logger.info('NostrCommerce framework stopped');
  }
}