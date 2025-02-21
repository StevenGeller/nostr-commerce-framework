import { NostrCommerce } from '../src/core/NostrCommerce';
import { logger } from '../src/core/logging';

async function main() {
  // Initialize the framework
  const framework = new NostrCommerce({
    relays: [
      'wss://relay.damus.io',
      'wss://relay.nostr.band'
    ],
    publicKey: process.env.PUBLIC_KEY!,
    privateKey: process.env.PRIVATE_KEY!
  });

  try {
    // Start the framework
    await framework.start();
    logger.info('Framework started successfully');

    // Example: Send a message
    const messageId = await framework.interaction.sendMessage(
      'Hello from Nostr Commerce Framework!',
      process.env.RECIPIENT_KEY!
    );
    logger.info('Message sent', { messageId });

    // Example: Create an invoice
    const invoiceId = await framework.commerce.createInvoice({
      amount: 1000, // 1000 sats
      description: 'Test payment'
    });
    logger.info('Invoice created', { invoiceId });

    // Listen for payments
    framework.commerce.on('paymentReceived', (payment) => {
      logger.info('Payment received', { payment });
    });

    // Example: Send a tip
    const tipId = await framework.commerce.processTip({
      recipient: process.env.RECIPIENT_KEY!,
      amount: 500,
      message: 'Thanks for the great work!'
    });
    logger.info('Tip sent', { tipId });

    // Keep the process running to receive events
    process.on('SIGINT', async () => {
      logger.info('Shutting down...');
      await framework.stop();
      process.exit(0);
    });

  } catch (error) {
    logger.error('Error in example', { error });
    await framework.stop();
    process.exit(1);
  }
}

// Check required environment variables
const requiredEnvVars = ['PUBLIC_KEY', 'PRIVATE_KEY', 'RECIPIENT_KEY'];
const missingEnvVars = requiredEnvVars.filter(v => !process.env[v]);

if (missingEnvVars.length > 0) {
  console.error('Missing required environment variables:', missingEnvVars.join(', '));
  process.exit(1);
}

main().catch(console.error);