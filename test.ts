import { NostrCommerce } from './src';

async function main() {
    // Initialize the framework with Primal relay
    const framework = new NostrCommerce({
        relays: ['wss://relay.primal.net'],  // Using Primal's high-performance relay
        publicKey: 'your-public-key',
        privateKey: 'your-private-key'
    });

    // Start the framework
    await framework.start();

    // Create an invoice
    const invoice = await framework.commerce.createInvoice({
        amount: 1000, // sats
        description: 'Test payment'
    });

    console.log('Created invoice:', invoice);

    // Listen for payments
    framework.commerce.on('paymentReceived', (payment) => {
        console.log('Payment received:', payment);
    });
}

main().catch(console.error);