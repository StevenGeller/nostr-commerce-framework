require('websocket-polyfill');
const { SimplePool, getPublicKey, generatePrivateKey, finishEvent } = require('nostr-tools');

async function main() {
    try {
        // Generate keys
        const privateKey = generatePrivateKey();
        const publicKey = getPublicKey(privateKey);
        
        console.log('Account Keys (SAVE THESE):');
        console.log('Private Key:', privateKey);
        console.log('Public Key:', publicKey);
        console.log('\nPrimal Profile URL:', `https://primal.net/p/${publicKey}`);

        // Create a pool
        const pool = new SimplePool();
        const relays = [
            'wss://relay.primal.net',
            'wss://relay.damus.io',
            'wss://nos.lol'
        ];
        
        // Create metadata event (kind 0)
        const metadataEvent = {
            kind: 0,
            pubkey: publicKey,
            created_at: Math.floor(Date.now() / 1000),
            tags: [],
            content: JSON.stringify({
                name: "Goose Test Account",
                about: "This is a test account created by Goose AI Assistant",
                picture: "https://upload.wikimedia.org/wikipedia/commons/4/43/Goose_in_flight.jpg"
            })
        };

        // Sign the metadata event
        const signedMetadata = finishEvent(metadataEvent, Buffer.from(privateKey, 'hex'));
        
        // Create post event (kind 1)
        const postEvent = {
            kind: 1,
            pubkey: publicKey,
            created_at: Math.floor(Date.now() / 1000),
            tags: [],
            content: "Hello Nostr! This is a test post from Goose AI Assistant. 🦢\n\nTesting the nostr-commerce-framework integration."
        };

        // Sign the post event
        const signedPost = finishEvent(postEvent, Buffer.from(privateKey, 'hex'));

        try {
            // Publish the metadata
            console.log('\nPublishing profile metadata...');
            await Promise.all(relays.map(relay => pool.publish([relay], signedMetadata)));

            // Publish the post
            console.log('Publishing test post...');
            await Promise.all(relays.map(relay => pool.publish([relay], signedPost)));

            console.log('\nEvents published! Your post should be visible at the Primal URL above.');
            
            // Keep connection alive briefly to ensure publication
            await new Promise(resolve => setTimeout(resolve, 3000));
            
        } finally {
            console.log('Cleaning up...');
            pool.close(relays);
        }
        
    } catch (error) {
        console.error('Error:', error);
        console.error('Stack:', error.stack);
    }
}

main();