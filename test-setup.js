// Example usage of nostr-commerce-framework
const crypto = require('crypto');

// Generate a random private key
const privateKey = crypto.randomBytes(32).toString('hex');

// Create a test configuration
const config = {
    relays: ['wss://relay.primal.net'],
    privateKey: privateKey
};

console.log('Test Configuration:');
console.log(JSON.stringify(config, null, 2));

// Save this configuration to use with the framework
const fs = require('fs');
fs.writeFileSync('test-config.json', JSON.stringify(config, null, 2));