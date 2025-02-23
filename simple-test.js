const { SimplePool, getPublicKey, generatePrivateKey, finishEvent } = require('nostr-tools');

async function main() {
    try {
        // Generate keys
        const privateKey = generatePrivateKey();
        const publicKey = getPublicKey(privateKey);
        
        console.log('Generated Keys:');
        console.log('Private Key:', privateKey);
        console.log('Public Key:', publicKey);

        // Create a pool
        const pool = new SimplePool();
        const relay = 'wss://relay.primal.net';
        
        // Create an event
        const event = {
            kind: 1,
            pubkey: publicKey,
            created_at: Math.floor(Date.now() / 1000),
            content: 'Testing nostr-commerce-framework integration',
            tags: []
        };

        // Sign the event
        const signedEvent = finishEvent(event, Buffer.from(privateKey, 'hex'));
        console.log('\nSigned Event:', signedEvent);

        try {
            // Publish the event
            console.log('Publishing to relay:', relay);
            const pub = await pool.publish([relay], signedEvent);
            console.log('Published:', pub);

            // Subscribe to our own events
            console.log('Subscribing to events...');
            const sub = pool.sub([relay], [{
                kinds: [1],
                authors: [publicKey]
            }]);

            sub.on('event', event => {
                console.log('Received event:', event);
            });

            // Keep the connection alive for a moment
            console.log('Waiting for events...');
            await new Promise(resolve => setTimeout(resolve, 5000));
            
        } finally {
            console.log('Cleaning up...');
            pool.close([relay]);
        }
        
    } catch (error) {
        console.error('Error:', error);
        console.error('Stack:', error.stack);
    }
}

main();