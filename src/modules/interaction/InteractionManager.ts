import { NostrEvent, InteractionModule } from '../../core/types';
import { NostrCommerce } from '../../core/NostrCommerce';

export class InteractionManager implements InteractionModule {
  private framework: NostrCommerce;
  private subscriptions: Map<string, () => void>;

  constructor(framework: NostrCommerce) {
    this.framework = framework;
    this.subscriptions = new Map();
  }

  /**
   * Send a direct message to a recipient
   */
  async sendMessage(content: string, recipient: string): Promise<string> {
    const event: Partial<NostrEvent> = {
      kind: 4, // Direct message
      content: content,
      tags: [['p', recipient]],
    };

    return await this.framework.publishEvent(event);
  }

  /**
   * Subscribe to incoming messages and events
   */
  subscribe(callback: (event: NostrEvent) => void): () => void {
    const filters = [
      {
        kinds: [4], // Direct messages
        since: Math.floor(Date.now() / 1000),
      },
    ];

    const unsubscribe = this.framework.subscribe(filters, callback);
    const subscriptionId = Math.random().toString(36).substring(7);
    this.subscriptions.set(subscriptionId, unsubscribe);

    return () => {
      unsubscribe();
      this.subscriptions.delete(subscriptionId);
    };
  }

  /**
   * Clean up all subscriptions
   */
  cleanup(): void {
    for (const unsubscribe of this.subscriptions.values()) {
      unsubscribe();
    }
    this.subscriptions.clear();
  }
}