"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.NostrCommerce = void 0;
const nostr_tools_1 = require("nostr-tools");
const errors_1 = require("./errors");
const logging_1 = require("./logging");
const validation_1 = require("./validation");
class NostrCommerce {
    constructor(config) {
        this.validateConfig(config);
        this.config = config;
        this.pools = new Map();
    }
    validateConfig(config) {
        if (!config.relays || config.relays.length === 0) {
            throw new errors_1.NostrError(errors_1.ErrorCode.INVALID_CONFIG, 'No relays specified in configuration');
        }
        if (!config.publicKey) {
            throw new errors_1.NostrError(errors_1.ErrorCode.INVALID_CONFIG, 'No public key specified in configuration');
        }
        if (!config.privateKey) {
            throw new errors_1.NostrError(errors_1.ErrorCode.INVALID_CONFIG, 'No private key specified in configuration');
        }
    }
    async start() {
        logging_1.logger.info('Starting NostrCommerce framework');
        try {
            await this.connectToRelays();
        }
        catch (error) {
            logging_1.logger.error('Failed to start framework', { error });
            throw error;
        }
    }
    async stop() {
        logging_1.logger.info('Stopping NostrCommerce framework');
        try {
            for (const [relay, pool] of this.pools) {
                try {
                    await pool.close(this.config.relays);
                }
                catch (error) {
                    logging_1.logger.error('Error closing relay connection', { relay, error });
                }
            }
            this.pools.clear();
        }
        catch (error) {
            logging_1.logger.error('Error stopping framework', { error });
        }
        logging_1.logger.info('NostrCommerce framework stopped');
    }
    async connectToRelays() {
        for (const relay of this.config.relays) {
            try {
                const pool = new nostr_tools_1.SimplePool();
                await pool.ensureRelay(relay);
                this.pools.set(relay, pool);
                logging_1.logger.info('Successfully connected to relay', { relay });
            }
            catch (error) {
                logging_1.logger.error('Failed to connect to relay', { relay, error });
                throw new errors_1.NostrError(errors_1.ErrorCode.RELAY_CONNECTION_FAILED, `Failed to connect to relay: ${relay}`, { relay, error });
            }
        }
    }
    async publish(event) {
        validation_1.eventValidator.validate(event);
        const promises = this.config.relays.map(async (relay) => {
            const pool = this.pools.get(relay);
            if (!pool) {
                throw new errors_1.NostrError(errors_1.ErrorCode.RELAY_CONNECTION_FAILED, `Not connected to relay: ${relay}`);
            }
            try {
                await pool.publish(this.config.relays, event);
                return true;
            }
            catch (error) {
                logging_1.logger.error('Failed to publish to relay', { relay, error });
                return false;
            }
        });
        const results = await Promise.all(promises);
        const successCount = results.filter(Boolean).length;
        if (successCount === 0) {
            throw new errors_1.NostrError(errors_1.ErrorCode.PUBLISH_FAILED, 'Failed to publish event to any relay');
        }
        return event.id;
    }
    subscribe(filters, callback) {
        const subscriptions = this.config.relays.map((relay) => {
            const pool = this.pools.get(relay);
            if (!pool) {
                throw new errors_1.NostrError(errors_1.ErrorCode.RELAY_CONNECTION_FAILED, `Not connected to relay: ${relay}`);
            }
            try {
                const sub = pool.sub(this.config.relays, filters);
                sub.on('event', callback);
                return sub;
            }
            catch (error) {
                logging_1.logger.error('Failed to subscribe to relay', { relay, error });
                throw new errors_1.NostrError(errors_1.ErrorCode.SUBSCRIPTION_FAILED, `Failed to subscribe to relay: ${relay}`, { relay, error });
            }
        });
        return () => {
            subscriptions.forEach((sub) => sub.unsub());
        };
    }
}
exports.NostrCommerce = NostrCommerce;
