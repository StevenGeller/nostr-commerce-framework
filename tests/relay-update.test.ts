import { NostrCommerce } from '../src/core/NostrCommerce';

describe('Relay Update Test', () => {
  let framework: NostrCommerce;

  beforeEach(() => {
    // Initialize with primal.net relay
    framework = new NostrCommerce({
      relays: ['wss://relay.primal.net'],
      publicKey: 'test-public-key',
      privateKey: 'test-private-key'
    });
  });

  afterEach(async () => {
    await framework.stop();
  });

  it('should connect to primal.net relay', async () => {
    await framework.start();
    
    // Create a test event
    const testEvent = {
      id: 'test-id',
      kind: 1,
      created_at: Math.floor(Date.now() / 1000),
      tags: [],
      content: 'Test message',
      pubkey: 'test-public-key',
      sig: 'test-signature'
    };

    // Try to publish an event
    await expect(framework.publish(testEvent)).resolves.toBe(testEvent.id);

    // Set up a subscription
    const filters = [{ kinds: [1] }];
    const callback = jest.fn();
    const unsubscribe = framework.subscribe(filters, callback);

    // Clean up subscription
    unsubscribe();
  });
});