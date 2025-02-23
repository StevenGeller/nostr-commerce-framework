require('websocket-polyfill');
const { SimplePool, getPublicKey, finishEvent } = require('nostr-tools');

async function main() {
    try {
        // Use the existing account keys
        const privateKey = 'f34e5ed7e2315ab8a19b13b61fc4446780eba390f119fa0dac2340ba6d76fbbb';
        const publicKey = 'bd6da988073266b3590d24063222d02e44cbc559fb5dd74834411090f38b6a9a';

        // Create a pool
        const pool = new SimplePool();
        const relays = [
            'wss://relay.primal.net',
            'wss://relay.damus.io',
            'wss://nos.lol'
        ];
        
        // Create a post with interactive commerce example
        const postEvent = {
            kind: 1,
            pubkey: publicKey,
            created_at: Math.floor(Date.now() / 1000),
            tags: [
                ['t', 'nostr-commerce'],
                ['t', 'example'],
                ['t', 'test']
            ],
            content: `🛍️ Nostr Commerce Framework Demo

Want to see how nostr-commerce-framework works? Here's a live demo!

🔵 Test Product: "Digital Goose NFT"
💰 Price: 1000 sats
📝 Description: A unique digital goose artwork demonstrating nostr-commerce-framework

To purchase:
1. Reply to this post with "!buy"
2. You'll receive a Lightning invoice in reply
3. Pay the invoice
4. Watch the payment confirmation post automatically!

This is a test implementation of nostr-commerce-framework. Source code: https://github.com/StevenGeller/nostr-commerce-framework

#nostr #bitcoin #lightning #commerce`
        };

        // Sign the post event
        const signedPost = finishEvent(postEvent, Buffer.from(privateKey, 'hex'));

        try {
            // Publish the post
            console.log('Publishing commerce example post...');
            await Promise.all(relays.map(relay => pool.publish([relay], signedPost)));

            console.log('\nPost published! You can view it at:');
            console.log(`https://primal.net/p/${publicKey}`);
            
            // Keep connection alive briefly to ensure publication
            await new Promise(resolve => setTimeout(resolve, 3000));
            
            // Start listening for responses
            console.log('\nListening for purchase requests...');
            const sub = pool.sub(relays, [{
                kinds: [1],
                '#e': [signedPost.id]  // Listen for replies to our post
            }]);

            sub.on('event', async (event) => {
                // Check if it's a purchase request
                if (event.content.toLowerCase().includes('!buy')) {
                    console.log('\nReceived purchase request from:', event.pubkey);
                    
                    // Create invoice event
                    const invoiceEvent = {
                        kind: 9733,  // Lightning invoice
                        pubkey: publicKey,
                        created_at: Math.floor(Date.now() / 1000),
                        content: JSON.stringify({
                            amount: 1000,
                            description: "Digital Goose NFT - Test Purchase",
                            currency: "BTC",
                            paymentRequest: "lnbc10n1p3hkkmypp5..." // This would be a real invoice in production
                        }),
                        tags: [
                            ['p', event.pubkey],  // Tag the buyer
                            ['e', event.id],      // Reference their request
                            ['amount', '1000'],
                            ['currency', 'BTC']
                        ]
                    };

                    // Sign and publish invoice
                    const signedInvoice = finishEvent(invoiceEvent, Buffer.from(privateKey, 'hex'));
                    await Promise.all(relays.map(relay => pool.publish([relay], signedInvoice)));
                    console.log('Published invoice:', signedInvoice.id);
                }
            });

            // Keep running to handle interactions
            console.log('Bot is running. Press Ctrl+C to stop.');
            await new Promise(() => {});  // Keep running indefinitely
            
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