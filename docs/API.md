# API Reference

## Core Framework

### NostrCommerce

The main framework class that manages Nostr connections, commerce features, and interactions.

```typescript
import { NostrCommerce } from 'nostr-commerce-framework';

const framework = new NostrCommerce({
  relays: ['wss://relay.primal.net'],
  publicKey: 'your-public-key',
  privateKey: 'your-private-key'
});
```

#### Configuration Options

| Option | Type | Description |
|--------|------|-------------|
| relays | string[] | List of Nostr relay URLs |
| publicKey | string | Your Nostr public key |
| privateKey | string | Your Nostr private key |
| maxConnections? | number | Maximum relay connections (default: 10) |
| connectionTimeout? | number | Connection timeout in ms (default: 5000) |
| rateLimitWindow? | number | Rate limit window in ms (default: 60000) |
| rateLimitMax? | number | Max requests per window (default: 100) |

#### Methods

##### `start(): Promise<void>`
Initialize the framework and connect to relays.

##### `stop(): Promise<void>`
Clean up resources and close connections.

##### `publishEvent(event: Partial<NostrEvent>): Promise<string>`
Publish an event to the Nostr network.

##### `subscribe(filters: any[], callback: (event: NostrEvent) => void): () => void`
Subscribe to events matching specific filters.

### Interaction Module

Handles messaging and user interactions.

```typescript
const interaction = framework.interaction;

// Send a message
const messageId = await interaction.sendMessage(
  'Hello!',
  'recipient-public-key'
);

// Subscribe to messages
const unsubscribe = interaction.subscribe((event) => {
  console.log('New message:', event);
});
```

#### Methods

##### `sendMessage(content: string, recipient: string): Promise<string>`
Send a direct message to a recipient.

##### `subscribe(callback: (event: NostrEvent) => void): () => void`
Subscribe to incoming messages.

### Commerce Module

Handles payments and commerce features.

```typescript
const commerce = framework.commerce;

// Create an invoice
const invoice = await commerce.createInvoice({
  amount: 1000,
  description: 'Test payment'
});

// Process a tip
await commerce.processTip({
  recipient: 'recipient-key',
  amount: 500
});

// Listen for payments
commerce.on('paymentReceived', (payment) => {
  console.log('Payment received:', payment);
});
```

#### Methods

##### `createInvoice(options: InvoiceOptions): Promise<string>`
Create a payment invoice.

```typescript
interface InvoiceOptions {
  amount: number;
  description: string;
  expiry?: number;  // Expiry time in seconds
  metadata?: Record<string, any>;
}
```

##### `processTip(options: TipOptions): Promise<string>`
Send a tip to a recipient.

```typescript
interface TipOptions {
  recipient: string;
  amount: number;
  message?: string;
}
```

##### `verifyPayment(invoiceId: string): Promise<boolean>`
Check if a payment has been received.

### Error Handling

The framework uses custom error classes for detailed error information:

```typescript
try {
  await framework.start();
} catch (error) {
  if (error instanceof NostrError) {
    console.error(
      'Error code:', error.code,
      'Message:', error.message,
      'Details:', error.details
    );
  }
}
```

### Events

The framework emits various events you can listen to:

```typescript
// Framework events
framework.on('ready', () => {
  console.log('Framework is ready');
});

framework.on('relay:connected', (relay) => {
  console.log('Connected to relay:', relay);
});

// Commerce events
framework.commerce.on('paymentReceived', (payment) => {
  console.log('Payment received:', payment);
});

framework.commerce.on('invoiceExpired', (invoiceId) => {
  console.log('Invoice expired:', invoiceId);
});
```

### Plugin System

Extend the framework's functionality with plugins:

```typescript
interface Plugin {
  onRegister?: (framework: NostrCommerce) => void;
  onInitialize?: () => void | Promise<void>;
  onStop?: () => void | Promise<void>;
}

const myPlugin: Plugin = {
  onRegister(framework) {
    // Setup plugin
  },
  async onInitialize() {
    // Initialize plugin
  },
  async onStop() {
    // Cleanup
  }
};

framework.registerPlugin('my-plugin', myPlugin);
```

## Best Practices

1. **Error Handling**
   ```typescript
   try {
     await framework.commerce.createInvoice({
       amount: 1000,
       description: 'Test'
     });
   } catch (error) {
     if (error.code === ErrorCode.INVALID_AMOUNT) {
       // Handle invalid amount
     }
   }
   ```

2. **Resource Cleanup**
   ```typescript
   const unsubscribe = framework.subscribe(filters, callback);
   // Later...
   unsubscribe();
   ```

3. **Security**
   - Store private keys securely
   - Validate all input data
   - Use rate limiting for public endpoints

4. **Performance**
   - Reuse connections when possible
   - Clean up subscriptions when not needed
   - Use appropriate cache settings

## Examples

See the [examples directory](https://github.com/stevengeller/nostr-commerce-framework/tree/main/examples) for complete usage examples:

- Basic usage
- Commerce integration
- Plugin development
- Custom event handling