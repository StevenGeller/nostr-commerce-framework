import { SimplePool, getPublicKey, getEventHash, signEvent } from 'nostr-tools';
import { EventEmitter } from 'events';
import { NostrConfig, NostrEvent, Plugin } from './types';

export class NostrCommerce extends EventEmitter {
  private pool: SimplePool;
  private config: NostrConfig;
  private plugins: Map<string, Plugin>;

  constructor(config: NostrConfig) {
    super();
    this.config = config;
    this.pool = new SimplePool();
    this.plugins = new Map();
  }

  /**
   * Initialize the framework
   */
  async start(): Promise<void> {
    await this.connectToRelays();
    this.initializePlugins();
    this.emit('ready');
  }

  /**
   * Connect to configured relays
   */
  private async connectToRelays(): Promise<void> {
    const relays = this.config.relays || [];
    for (const relay of relays) {
      try {
        await this.pool.ensureRelay(relay);
        this.emit('relay:connected', relay);
      } catch (error) {
        this.emit('relay:error', { relay, error });
      }
    }
  }

  /**
   * Register a plugin
   */
  registerPlugin(name: string, plugin: Plugin): void {
    if (this.plugins.has(name)) {
      throw new Error(`Plugin ${name} is already registered`);
    }
    this.plugins.set(name, plugin);
    plugin.onRegister?.(this);
  }

  /**
   * Initialize all registered plugins
   */
  private initializePlugins(): void {
    for (const [name, plugin] of this.plugins) {
      try {
        plugin.onInitialize?.();
        this.emit('plugin:initialized', name);
      } catch (error) {
        this.emit('plugin:error', { name, error });
      }
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
    } as NostrEvent;

    finalEvent.id = getEventHash(finalEvent);
    finalEvent.sig = await signEvent(finalEvent, this.config.privateKey);

    const pub = this.pool.publish(this.config.relays, finalEvent);
    await Promise.race([
      pub,
      new Promise((_, reject) => setTimeout(() => reject(new Error('Publish timeout')), 5000))
    ]);

    return finalEvent.id;
  }

  /**
   * Subscribe to events matching specific filters
   */
  subscribe(filters: any[], onEvent: (event: NostrEvent) => void): () => void {
    const sub = this.pool.sub(this.config.relays, filters);
    sub.on('event', onEvent);
    return () => sub.unsub();
  }

  /**
   * Clean up resources
   */
  async stop(): Promise<void> {
    this.pool.close(this.config.relays);
    for (const plugin of this.plugins.values()) {
      await plugin.onStop?.();
    }
    this.emit('stopped');
  }
}