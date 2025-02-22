# API Reference

## Core Framework

### NostrCommerce

The main framework class that manages Nostr connections, commerce features, and interactions.

```typescript
import { NostrCommerce } from 'nostr-commerce-framework';

const framework = new NostrCommerce({
  relays: ['wss://relay.primal.net'],
  publicKey: 'your-public-key',
  privateKey: 'your-private-key',
  lud16: 'your-lightning-address@getalby.com'  // Optional, for Zap support
});
```

#### Configuration Options

| Option | Type | Description |
|--------|------|-------------|
| relays | string[] | List of Nostr relay URLs |
| publicKey | string | Your Nostr public key |
| privateKey | string | Your Nostr private key |
| lud16? | string | Lightning Address for Zap support |
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

### Commerce Module

Handles payments and commerce features, including Lightning Network and Nostr Zaps.

```typescript
const commerce = framework.commerce;

// Create a Lightning invoice
const invoice = await commerce.createInvoice({
  amount: 1000,
  description: 'Test payment'
});

// Process a Zap
await commerce.processZap({
  recipient: 'recipient-pubkey',
  amount: 1000,
  comment: 'Great content!'
});

// Listen for payments (both Lightning and Zaps)
commerce.on('paymentReceived', (payment) => {
  console.log('Payment received:', payment);
  // payment.type will be either 'invoice' or 'zap'
});
```

#### Methods

##### `createInvoice(options: InvoiceOptions): Promise<string>`
Create a Lightning Network payment invoice.

```typescript
interface InvoiceOptions {
  amount: number;
  description: string;
  expiry?: number;  // Expiry time in seconds
  metadata?: Record<string, any>;
}
```

##### `processZap(options: ZapOptions): Promise<string>`
Process a Nostr Zap payment.

```typescript
interface ZapOptions {
  recipient: string;
  amount: number;
  comment?: string;
  eventId?: string;  // Optional reference event
  tags?: string[][];  // Additional NIP-57 tags
}
```

##### `verifyPayment(paymentId: string, type?: 'invoice' | 'zap'): Promise<boolean>`
Check if a payment has been received. Type is optional - if not specified, both payment types will be checked.

### Payment Events

The framework handles both traditional Lightning payments and Nostr Zaps:

```typescript
// Lightning payment received
commerce.on('paymentReceived', (payment) => {
  if (payment.type === 'invoice') {
    console.log('Lightning payment:', payment.invoiceId);
  }
});

// Zap received
commerce.on('paymentReceived', (payment) => {
  if (payment.type === 'zap') {
    console.log('Zap received:', {
      amount: payment.amount,
      sender: payment.senderPubkey,
      eventId: payment.zapEventId
    });
  }
});

// Payment expired
commerce.on('paymentExpired', (payment) => {
  console.log('Payment expired:', payment);
});
```

### Nostr Events

The framework uses several Nostr event kinds:

```typescript
// Standard Nostr event kinds
const ZAP_REQUEST = 9734;
const ZAP_RECEIPT = 9735;

// Custom event kinds for commerce
const INVOICE_REQUEST = 30020;
const PAYMENT_RECEIPT = 30021;

// Subscribe to Zap events
framework.subscribe([{ kinds: [ZAP_RECEIPT] }], (event) => {
  console.log('Zap received:', event);
});
```

### Error Handling

The framework includes specific error handling for payment scenarios:

```typescript
try {
  await commerce.processZap({
    recipient: 'pubkey',
    amount: 1000
  });
} catch (error) {
  if (error instanceof NostrError) {
    switch (error.code) {
      case ErrorCode.ZAP_FAILED:
        console.error('Zap failed:', error.details);
        break;
      case ErrorCode.INVALID_LIGHTNING_ADDRESS:
        console.error('Invalid Lightning address');
        break;
      case ErrorCode.PAYMENT_FAILED:
        console.error('Payment failed:', error.details);
        break;
    }
  }
}
```

## Examples

See the [examples directory](https://github.com/stevengeller/nostr-commerce-framework/tree/main/examples) for complete usage examples:

### Image Store Example
A complete e-commerce application demonstrating:
- Image preview and watermarking
- Lightning Network payments
- Nostr Zap integration
- Purchase verification
- Secure content delivery

### Basic Commerce Example
```typescript
import { NostrCommerce } from 'nostr-commerce-framework';

const framework = new NostrCommerce({
  relays: ['wss://relay.primal.net'],
  publicKey: 'your-public-key',
  privateKey: 'your-private-key',
  lud16: 'your-lightning-address@getalby.com'
});

// Start the framework
await framework.start();

// Create an invoice
const invoice = await framework.commerce.createInvoice({
  amount: 1000,
  description: 'Test payment'
});

// Listen for both Lightning and Zap payments
framework.commerce.on('paymentReceived', (payment) => {
  if (payment.type === 'zap') {
    console.log('Zap received:', payment.zapEventId);
  } else {
    console.log('Lightning payment received:', payment.invoiceId);
  }
});

// Clean up
await framework.stop();
```

For more examples and detailed documentation, visit:
- [Commerce Integration Guide](docs/COMMERCE.md)
- [Security Best Practices](docs/SECURITY.md)
- [Plugin Development](docs/PLUGINS.md)