"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.InteractionManager = void 0;
class InteractionManager {
    constructor(framework) {
        this.framework = framework;
        this.subscriptions = new Map();
    }
    /**
     * Send a direct message to a recipient
     */
    async sendMessage(content, recipient) {
        const event = {
            kind: 4, // Direct message
            content: content,
            tags: [['p', recipient]],
        };
        return await this.framework.publishEvent(event);
    }
    /**
     * Subscribe to incoming messages and events
     */
    subscribe(callback) {
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
    cleanup() {
        for (const unsubscribe of this.subscriptions.values()) {
            unsubscribe();
        }
        this.subscriptions.clear();
    }
}
exports.InteractionManager = InteractionManager;
