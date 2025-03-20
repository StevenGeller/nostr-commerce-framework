const NostrCommerce = require('../../src');

const store = new NostrCommerce().createStore({
    name: 'Primal Store',
    description: 'Example store using Nostr Commerce Framework',
    currency: 'BTC'
});

module.exports = store;