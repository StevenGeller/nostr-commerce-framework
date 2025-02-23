const fs = require('fs');
const NostrCommerce = require('./src');

async function main() {
    try {
        // Load configuration
        const config = JSON.parse(fs.readFileSync('test-config.json', 'utf8'));
        
        // Initialize the framework
        const framework = new NostrCommerce({
            relays: config.relays,
            privateKey: config.privateKey
        });
        
        // Start the framework
        await framework.start();
        console.log('Framework started successfully');
        
        // Create a test invoice
        const invoice = await framework.commerce.createInvoice({
            amount: 1000, // 1000 sats
            description: 'Test payment'
        });
        
        console.log('Created invoice:', invoice);
        
        // Listen for payments
        framework.commerce.on('paymentReceived', (payment) => {
            console.log('Payment received:', payment);
        });
        
        console.log('Listening for payments...');
        
    } catch (error) {
        console.error('Error:', error);
    }
}

main();