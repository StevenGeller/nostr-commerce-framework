import { NostrCommerce } from '../core/NostrCommerce';
import { InteractionManager } from '../modules/interaction/InteractionManager';
import { CommerceManager } from '../modules/commerce/CommerceManager';

async function main() {
  // Initialize the framework
  const framework = new NostrCommerce({
    relays: [
      'wss://relay.damus.io',
      'wss://relay.nostr.band',
    ],
    publicKey: 'YOUR_PUBLIC_KEY',
    privateKey: 'YOUR_PRIVATE_KEY',
  });

  // Initialize modules
  const interaction = new InteractionManager(framework);
  const commerce = new CommerceManager(framework);

  // Start the framework
  await framework.start();

  // Subscribe to messages
  const unsubscribe = interaction.subscribe((event) => {
    console.log('Received message:', event);
  });

  // Example: Send a message
  try {
    const messageId = await interaction.sendMessage(
      'Hello from Nostr Commerce Framework!',
      'RECIPIENT_PUBLIC_KEY'
    );
    console.log('Message sent with ID:', messageId);
  } catch (error) {
    console.error('Error sending message:', error);
  }

  // Example: Create an invoice
  try {
    const invoiceId = await commerce.createInvoice(
      1000, // Amount in sats
      'Test payment'
    );
    console.log('Invoice created with ID:', invoiceId);

    // Check payment status after 30 seconds
    setTimeout(async () => {
      const isPaid = await commerce.verifyPayment(invoiceId);
      console.log('Payment status:', isPaid ? 'Paid' : 'Pending');
    }, 30000);
  } catch (error) {
    console.error('Error creating invoice:', error);
  }

  // Example: Send a tip
  try {
    const tipId = await commerce.processTip(
      'RECIPIENT_PUBLIC_KEY',
      500 // Amount in sats
    );
    console.log('Tip sent with ID:', tipId);
  } catch (error) {
    console.error('Error sending tip:', error);
  }

  // Clean up when done
  setTimeout(() => {
    unsubscribe();
    interaction.cleanup();
    commerce.cleanup();
    framework.stop();
  }, 60000);
}

main().catch(console.error);