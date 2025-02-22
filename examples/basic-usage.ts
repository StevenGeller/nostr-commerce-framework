import { NostrCommerce } from '../src/core/NostrCommerce';
import { logger } from '../src/core/logging';
import { NostrError, ErrorCode } from '../src/core/errors';

async function main() {
  // Initialize the framework
  const framework = new NostrCommerce({
    relays: ['wss://relay.primal.net'],  // Using Primal's high-performance relay
    publicKey: process.env.PUBLIC_KEY!,
    privateKey: process.env.PRIVATE_KEY!
  });

  try {
    // Start the framework
    await framework.start();
    logger.info('Framework started successfully');

    // Example: Send a message
    try {
      const messageId = await framework.interaction.sendMessage(
        'Hello from Nostr Commerce Framework!',
        process.env.RECIPIENT_KEY!
      );
      logger.info('Message sent', { messageId });
    } catch (error) {
      if (error instanceof NostrError && error.code === ErrorCode.RELAY_CONNECTION_FAILED) {
        logger.error('Failed to send message - relay connection issue');
      } else {
        throw error;
      }
    }

    // Example: Create an invoice
    try {
      const invoiceId = await framework.commerce.createInvoice({
        amount: 1000, // 1000 sats
        description: 'Test payment',
        expiry: 3600, // 1 hour
        metadata: {
          orderId: '12345',
          productId: 'test-product'
        }
      });
      logger.info('Invoice created', { invoiceId });

      // Verify payment
      const isPaid = await framework.commerce.verifyPayment(invoiceId);
      logger.info('Payment status', { invoiceId, isPaid });
    } catch (error) {
      if (error instanceof NostrError) {
        switch (error.code) {
          case ErrorCode.INVALID_AMOUNT:
            logger.error('Invalid payment amount');
            break;
          case ErrorCode.INVOICE_EXPIRED:
            logger.error('Invoice has expired');
            break;
          default:
            logger.error('Commerce error', { code: error.code, message: error.message });
        }
      } else {
        throw error;
      }
    }

    // Listen for payments
    framework.commerce.on('paymentReceived', (payment) => {
      logger.info('Payment received', { payment });
    });

    framework.commerce.on('invoiceExpired', (invoiceId) => {
      logger.warn('Invoice expired', { invoiceId });
    });

    // Example: Send a tip
    try {
      const tipId = await framework.commerce.processTip({
        recipient: process.env.RECIPIENT_KEY!,
        amount: 500,
        message: 'Thanks for the great work!'
      });
      logger.info('Tip sent', { tipId });
    } catch (error) {
      if (error instanceof NostrError && error.code === ErrorCode.INSUFFICIENT_FUNDS) {
        logger.error('Insufficient funds for tip');
      } else {
        throw error;
      }
    }

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