# Nostr Wallet Connect Integration

## Overview

The Nostr Commerce Framework provides comprehensive support for [Nostr Wallet Connect (NWC)](https://nwc.dev/), enabling seamless integration with Lightning wallets. This implementation follows NIP-47 and provides a robust, production-ready solution for Lightning payments.

## Features

- 🔐 Secure wallet connections
- ⚡ Lightning payment processing
- 📝 Invoice generation
- 🔄 Automatic reconnection
- 🛡️ Error handling
- 📊 Payment status tracking
- 🔍 Wallet capability detection
- 📨 Message encryption (NIP-04)
- ✍️ Message signing

## Quick Start

```typescript
import { NostrWalletConnect } from 'nostr-commerce-framework/nwc';

// Initialize NWC
const nwc = new NostrWalletConnect({
  relayUrl: 'wss://relay.damus.io',
  autoReconnect: true
});

// Connect to wallet
const connection = await nwc.connect('wallet-pubkey');
console.log('Connected with capabilities:', connection.capabilities);

// Process payment
const payment = await nwc.payInvoice({
  amount: 1000,
  invoice: 'lnbc...',
  comment: 'Test payment'
});
console.log('Payment successful:', payment);
```

## Advanced Usage

### Connection Management

```typescript
const nwc = new NostrWalletConnect({
  relayUrl: 'wss://relay.damus.io',
  autoReconnect: true,
  maxRetries: 3,
  connectionTimeout: 30000,
  paymentTimeout: 60000
});

// Handle connection events
nwc.on('connected', (info) => {
  console.log('Connected to wallet:', info);
  console.log('Supported capabilities:', info.capabilities);
});

nwc.on('disconnected', () => {
  console.log('Disconnected from wallet');
});

nwc.on('error', (error) => {
  console.error('NWC error:', error);
});

// Check connection status
if (nwc.isConnected()) {
  const capabilities = nwc.getCapabilities();
  console.log('Current capabilities:', capabilities);
}
```

### Payment Processing

```typescript
// Create and pay invoice
try {
  // Create invoice
  const invoice = await nwc.createInvoice(1000, 'Product purchase');
  
  // Process payment
  const payment = await nwc.payInvoice({
    amount: 1000,
    invoice,
    comment: 'Product purchase',
    externalId: 'order-123', // For tracking
    timeout: 120000 // Custom timeout
  });

  console.log('Payment successful:', {
    amount: payment.amount,
    hash: payment.paymentHash,
    fee: payment.fee
  });
} catch (error) {
  if (error.message === 'Payment timeout') {
    // Handle timeout
  } else if (error.message === 'Insufficient funds') {
    // Handle insufficient funds
  } else {
    // Handle other errors
  }
}
```

### Secure Messaging

```typescript
// Sign message
const signature = await nwc.signMessage('Hello, Nostr!');

// Encrypt message
const encrypted = await nwc.encryptMessage(
  'Secret message',
  recipientPubkey
);

// Decrypt message
const decrypted = await nwc.decryptMessage(
  encryptedMessage,
  senderPubkey
);
```

### Wallet Information

```typescript
// Get wallet info
const info = await nwc.getInfo();
console.log('Wallet info:', {
  balance: info.balance,
  network: info.network,
  features: info.features
});

// Check capabilities
if (nwc.hasCapability('payInvoice')) {
  console.log('Wallet can pay invoices');
}

// Get last known balance
const balance = nwc.getLastKnownBalance();
```

## Integration Patterns

### E-commerce Integration

```typescript
class PaymentProcessor {
  constructor(private nwc: NostrWalletConnect) {}

  async processOrder(order: Order) {
    try {
      // Create invoice
      const invoice = await this.nwc.createInvoice(
        order.amount,
        `Order ${order.id}`
      );

      // Process payment
      const payment = await this.nwc.payInvoice({
        amount: order.amount,
        invoice,
        externalId: order.id
      });

      // Verify payment
      if (payment.amount === order.amount) {
        await this.fulfillOrder(order, payment);
      }
    } catch (error) {
      await this.handlePaymentError(order, error);
    }
  }
}
```

### Subscription Handling

```typescript
class SubscriptionManager {
  constructor(private nwc: NostrWalletConnect) {
    this.setupEventHandlers();
  }

  private setupEventHandlers() {
    this.nwc.on('payment', this.handlePayment.bind(this));
    this.nwc.on('disconnected', this.handleDisconnect.bind(this));
  }

  async createSubscription(userId: string, plan: Plan) {
    const invoice = await this.nwc.createInvoice(
      plan.amount,
      `Subscription: ${plan.name}`
    );

    return {
      userId,
      planId: plan.id,
      invoice,
      status: 'pending'
    };
  }
}
```

### Error Recovery

```typescript
class PaymentRetryHandler {
  async retryPayment(
    invoice: string,
    maxAttempts = 3,
    backoff = 1000
  ) {
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        return await this.nwc.payInvoice({
          amount: 1000,
          invoice,
          timeout: backoff * attempt
        });
      } catch (error) {
        if (attempt === maxAttempts) throw error;
        await new Promise(r => setTimeout(r, backoff * attempt));
      }
    }
  }
}
```

## Best Practices

### 1. Connection Management

- Always handle disconnection events
- Implement reconnection logic
- Monitor connection health
- Verify wallet capabilities

```typescript
nwc.on('disconnected', async () => {
  console.log('Disconnected, attempting to reconnect...');
  try {
    await nwc.connect(walletPubkey);
  } catch (error) {
    console.error('Reconnection failed:', error);
  }
});
```

### 2. Error Handling

- Implement comprehensive error handling
- Use appropriate timeouts
- Handle specific error cases
- Provide clear error messages

```typescript
try {
  await nwc.payInvoice(request);
} catch (error) {
  switch (error.message) {
    case 'Not connected to wallet':
      // Handle connection error
      break;
    case 'Payment timeout':
      // Handle timeout
      break;
    case 'Insufficient funds':
      // Handle insufficient funds
      break;
    default:
      // Handle unknown error
  }
}
```

### 3. Payment Verification

- Always verify payment amounts
- Check payment status
- Implement idempotency
- Handle partial payments

```typescript
function verifyPayment(payment: PaymentResponse, expected: number) {
  if (payment.amount !== expected) {
    throw new Error('Payment amount mismatch');
  }
  // Additional verification...
}
```

### 4. Security Considerations

- Secure key management
- Validate all inputs
- Implement rate limiting
- Monitor for suspicious activity

```typescript
class SecurityManager {
  private rateLimiter = new RateLimiter();

  async validatePayment(request: PaymentRequest) {
    // Check rate limits
    if (!this.rateLimiter.checkLimit(request.amount)) {
      throw new Error('Rate limit exceeded');
    }

    // Validate amount
    if (request.amount <= 0 || request.amount > MAX_AMOUNT) {
      throw new Error('Invalid amount');
    }

    // Additional validation...
  }
}
```

## Testing

### Unit Tests

```typescript
describe('NostrWalletConnect', () => {
  let nwc: NostrWalletConnect;

  beforeEach(() => {
    nwc = new NostrWalletConnect({
      relayUrl: 'wss://relay.damus.io'
    });
  });

  it('should connect to wallet', async () => {
    const info = await nwc.connect('test-pubkey');
    expect(info.status).toBe('connected');
  });

  it('should process payments', async () => {
    const payment = await nwc.payInvoice({
      amount: 1000,
      invoice: 'test-invoice'
    });
    expect(payment.amount).toBe(1000);
  });
});
```

### Integration Tests

```typescript
describe('NWC Integration', () => {
  it('should complete e-commerce flow', async () => {
    // Setup
    const app = new EcommerceApp();
    await app.start();

    // Connect wallet
    await app.connectWallet('test-pubkey');

    // Create order
    const order = await app.createOrder('product1', {
      email: 'test@example.com'
    });

    // Process payment
    const result = await app.processPayment(order);
    expect(result.status).toBe('success');

    // Cleanup
    await app.disconnect();
  });
});
```

## Troubleshooting

### Common Issues

1. **Connection Issues**
   - Check relay connectivity
   - Verify wallet public key
   - Ensure proper permissions

2. **Payment Failures**
   - Verify invoice validity
   - Check wallet balance
   - Confirm relay messages

3. **Timeout Errors**
   - Adjust timeout settings
   - Check network connectivity
   - Verify relay responsiveness

### Debugging

```typescript
// Enable debug mode
const nwc = new NostrWalletConnect({
  relayUrl: 'wss://relay.damus.io',
  debug: true
});

// Log all events
nwc.on('*', (event) => {
  console.log('NWC Event:', event);
});

// Monitor relay status
nwc.on('relay', (status) => {
  console.log('Relay status:', status);
});
```

## Resources

- [NWC Protocol Specification](https://nwc.dev/docs)
- [NIP-47 Specification](https://github.com/nostr-protocol/nips/blob/master/47.md)
- [Nostr Implementation Guide](https://github.com/nostr-protocol/nips)
- [Example Implementation](https://github.com/StevenGeller/nostr-commerce-framework/tree/main/examples)