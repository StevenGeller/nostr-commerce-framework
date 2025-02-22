import { SimplePool } from 'nostr-tools';
import { NostrEvent, NostrConfig } from './types';
import { NostrError, ErrorCode } from './errors';
import { logger } from './logging';
import { eventValidator } from './validation';

export class NostrCommerce {
  private pools: Map<string, SimplePool>;
  private config: NostrConfig;

  constructor(config: NostrConfig) {
    this.validateConfig(config);
    this.config = config;
    this.pools = new Map();
  }

  private validateConfig(config: NostrConfig): void {
    if (!config.relays || config.relays.length === 0) {
      throw new NostrError(
        ErrorCode.INVALID_CONFIG,
        'No relays specified in configuration'
      );
    }

    if (!config.publicKey) {
      throw new NostrError(
        ErrorCode.INVALID_CONFIG,
        'No public key specified in configuration'
      );
    }

    if (!config.privateKey) {
      throw new NostrError(
        ErrorCode.INVALID_CONFIG,
        'No private key specified in configuration'
      );
    }
  }

  async start(): Promise<void> {
    logger.info('Starting NostrCommerce framework');

    try {
      await this.connectToRelays();
    } catch (error) {
      logger.error('Failed to start framework', { error });
      throw error;
    }
  }

  async stop(): Promise<void> {
    logger.info('Stopping NostrCommerce framework');

    try {
      for (const [relay, pool] of this.pools) {
        try {
          await pool.close(this.config.relays);
        } catch (error) {
          logger.error('Error closing relay connection', { relay, error });
        }
      }
      this.pools.clear();
    } catch (error) {
      logger.error('Error stopping framework', { error });
    }

    logger.info('NostrCommerce framework stopped');
  }

  private async connectToRelays(): Promise<void> {
    for (const relay of this.config.relays) {
      try {
        const pool = new SimplePool();
        await pool.ensureRelay(relay);
        this.pools.set(relay, pool);
        logger.info('Successfully connected to relay', { relay });
      } catch (error) {
        logger.error('Failed to connect to relay', { relay, error });
        throw new NostrError(
          ErrorCode.RELAY_CONNECTION_FAILED,
          `Failed to connect to relay: ${relay}`,
          { relay, error }
        );
      }
    }
  }

  async publish(event: NostrEvent): Promise<string> {
    eventValidator.validate(event);

    const promises = this.config.relays.map(async (relay) => {
      const pool = this.pools.get(relay);
      if (!pool) {
        throw new NostrError(
          ErrorCode.RELAY_CONNECTION_FAILED,
          `Not connected to relay: ${relay}`
        );
      }

      try {
        await pool.publish(this.config.relays, event);
        return true;
      } catch (error) {
        logger.error('Failed to publish to relay', { relay, error });
        return false;
      }
    });

    const results = await Promise.all(promises);
    const successCount = results.filter(Boolean).length;

    if (successCount === 0) {
      throw new NostrError(
        ErrorCode.PUBLISH_FAILED,
        'Failed to publish event to any relay'
      );
    }

    return event.id;
  }

  subscribe(filters: any[], callback: (event: NostrEvent) => void): () => void {
    const subscriptions = this.config.relays.map((relay) => {
      const pool = this.pools.get(relay);
      if (!pool) {
        throw new NostrError(
          ErrorCode.RELAY_CONNECTION_FAILED,
          `Not connected to relay: ${relay}`
        );
      }

      try {
        const sub = pool.sub(this.config.relays, filters);
        sub.on('event', callback);
        return sub;
      } catch (error) {
        logger.error('Failed to subscribe to relay', { relay, error });
        throw new NostrError(
          ErrorCode.SUBSCRIPTION_FAILED,
          `Failed to subscribe to relay: ${relay}`,
          { relay, error }
        );
      }
    });

    return () => {
      subscriptions.forEach((sub) => sub.unsub());
    };
  }
}