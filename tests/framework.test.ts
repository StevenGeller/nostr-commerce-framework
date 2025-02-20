import { NostrCommerce } from '../src/core/NostrCommerce';
import { InteractionManager } from '../src/modules/interaction/InteractionManager';
import { CommerceManager } from '../src/modules/commerce/CommerceManager';

describe('NostrCommerce Framework', () => {
  let framework: NostrCommerce;
  let interaction: InteractionManager;
  let commerce: CommerceManager;

  beforeEach(() => {
    framework = new NostrCommerce({
      relays: ['wss://relay.damus.io'],
      publicKey: 'test-public-key',
      privateKey: 'test-private-key',
    });
    interaction = new InteractionManager(framework);
    commerce = new CommerceManager(framework);
  });

  afterEach(async () => {
    await framework.stop();
  });

  describe('InteractionManager', () => {
    it('should send a message', async () => {
      const messageId = await interaction.sendMessage('Test message', 'recipient-key');
      expect(messageId).toBeTruthy();
    });

    it('should subscribe to messages', () => {
      const callback = jest.fn();
      const unsubscribe = interaction.subscribe(callback);
      
      expect(typeof unsubscribe).toBe('function');
      unsubscribe();
    });
  });

  describe('CommerceManager', () => {
    it('should create an invoice', async () => {
      const invoiceId = await commerce.createInvoice(1000, 'Test payment');
      expect(invoiceId).toBeTruthy();
    });

    it('should process a tip', async () => {
      const tipId = await commerce.processTip('recipient-key', 500);
      expect(tipId).toBeTruthy();
    });

    it('should verify payment status', async () => {
      const invoiceId = await commerce.createInvoice(1000, 'Test payment');
      const isPaid = await commerce.verifyPayment(invoiceId);
      expect(isPaid).toBe(false);
    });
  });
});