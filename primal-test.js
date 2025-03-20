const { NostrCommerce } = require('./dist/core/NostrCommerce');

// Use the generated keys from above
const PRIVATE_KEY = '357c918594227743bcc2ffe0ff755bd29b3adcdb96e83a1b6b98cc17877163a1';
const PUBLIC_KEY = 'ffb9d7006dd59ffd7eac468b0c08366a15b9c488df66964d7db69539580c3965';

async function main() {
  // Initialize the framework
  const framework = new NostrCommerce({
    relays: ['wss://relay.primal.net'],
    publicKey: PUBLIC_KEY,
    privateKey: PRIVATE_KEY
  });

  try {
    // Start the framework
    console.log('Starting Nostr Commerce Framework...');
    await framework.start();
    console.log('Framework started successfully');

    // Create a test invoice
    const invoice = await framework.commerce.createInvoice({
      amount: 1000, // 1000 sats
      description: 'Test product on Primal',
      expiry: 3600, // 1 hour
      metadata: {
        orderId: 'TEST-001',
        productId: 'PRIMAL-TEST-PRODUCT'
      }
    });
    
    console.log('Invoice created:', invoice);

    // Listen for payments
    framework.commerce.on('paymentReceived', (payment) => {
      console.log('Payment received:', payment);
    });

    // Keep the process running
    console.log('Listening for payments... Press Ctrl+C to exit');
    
    process.on('SIGINT', async () => {
      console.log('Shutting down...');
      await framework.stop();
      process.exit(0);
    });

  } catch (error) {
    console.error('Error:', error);
    await framework.stop();
    process.exit(1);
  }
}

main().catch(console.error);