const { SimplePool, getPublicKey, generatePrivateKey, finishEvent } = require('nostr-tools');

async function main() {
    try {
        // Generate keys for seller
        const sellerPrivateKey = generatePrivateKey();
        const sellerPublicKey = getPublicKey(sellerPrivateKey);
        
        // Generate keys for buyer
        const buyerPrivateKey = generatePrivateKey();
        const buyerPublicKey = getPublicKey(buyerPrivateKey);
        
        console.log('Seller Keys:');
        console.log('Private Key:', sellerPrivateKey);
        console.log('Public Key:', sellerPublicKey);
        
        console.log('\nBuyer Keys:');
        console.log('Private Key:', buyerPrivateKey);
        console.log('Public Key:', buyerPublicKey);

        // Create a pool
        const pool = new SimplePool();
        const relay = 'wss://relay.primal.net';
        
        // Create an invoice event (kind 9733)
        const invoiceEvent = {
            kind: 9733, // Lightning invoice kind
            pubkey: sellerPublicKey,
            created_at: Math.floor(Date.now() / 1000),
            content: JSON.stringify({
                amount: 1000, // 1000 sats
                description: 'Test product purchase',
                currency: 'BTC',
                paymentRequest: 'lnbc10n1p3hkkmypp5...' // This would be a real Lightning invoice in practice
            }),
            tags: [
                ['p', buyerPublicKey], // Tag the buyer
                ['amount', '1000'],
                ['currency', 'BTC']
            ]
        };

        // Sign the invoice event
        const signedInvoice = finishEvent(invoiceEvent, Buffer.from(sellerPrivateKey, 'hex'));
        console.log('\nSigned Invoice Event:', signedInvoice);

        try {
            // Publish the invoice
            console.log('\nPublishing invoice to relay:', relay);
            const pub = await pool.publish([relay], signedInvoice);
            console.log('Published:', pub);

            // Simulate payment confirmation (kind 9734)
            const paymentEvent = {
                kind: 9734, // Payment confirmation kind
                pubkey: buyerPublicKey,
                created_at: Math.floor(Date.now() / 1000),
                content: JSON.stringify({
                    amount: 1000,
                    description: 'Payment for test product',
                    preimage: '0000000000000000000000000000000000000000000000000000000000000000'
                }),
                tags: [
                    ['e', signedInvoice.id], // Reference the invoice
                    ['p', sellerPublicKey], // Tag the seller
                    ['amount', '1000'],
                    ['currency', 'BTC']
                ]
            };

            // Sign the payment event
            const signedPayment = finishEvent(paymentEvent, Buffer.from(buyerPrivateKey, 'hex'));
            console.log('\nSigned Payment Event:', signedPayment);

            // Publish the payment confirmation
            console.log('\nPublishing payment confirmation to relay:', relay);
            const payPub = await pool.publish([relay], signedPayment);
            console.log('Published:', payPub);

            // Subscribe to both invoice and payment events
            console.log('\nSubscribing to events...');
            const sub = pool.sub([relay], [{
                kinds: [9733, 9734],
                authors: [sellerPublicKey, buyerPublicKey]
            }]);

            sub.on('event', event => {
                if (event.kind === 9733) {
                    console.log('\nReceived invoice event:', event);
                } else if (event.kind === 9734) {
                    console.log('\nReceived payment event:', event);
                }
            });

            // Keep connection alive for a bit
            console.log('\nWaiting for events...');
            await new Promise(resolve => setTimeout(resolve, 5000));
            
        } finally {
            console.log('\nCleaning up...');
            pool.close([relay]);
        }
        
    } catch (error) {
        console.error('Error:', error);
        console.error('Stack:', error.stack);
    }
}

main();