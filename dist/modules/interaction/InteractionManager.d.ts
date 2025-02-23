import { NostrEvent, InteractionModule } from '../../core/types';
import { NostrCommerce } from '../../core/NostrCommerce';
export declare class InteractionManager implements InteractionModule {
    private framework;
    private subscriptions;
    constructor(framework: NostrCommerce);
    /**
     * Send a direct message to a recipient
     */
    sendMessage(content: string, recipient: string): Promise<string>;
    /**
     * Subscribe to incoming messages and events
     */
    subscribe(callback: (event: NostrEvent) => void): () => void;
    /**
     * Clean up all subscriptions
     */
    cleanup(): void;
}
