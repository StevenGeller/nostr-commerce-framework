const { EventEmitter } = require('events');

class NostrCommerce extends EventEmitter {
    constructor(options = {}) {
        super();
        this.options = options;
    }

    createStore(storeConfig) {
        return {
            ...storeConfig,
            createInvoice: async function(amount, currency = 'BTC') {
                return {
                    amount,
                    currency,
                    id: Date.now().toString(),
                    created_at: new Date().toISOString()
                };
            }
        };
    }
}

module.exports = NostrCommerce;
