# Nostr Wallet Connect Integration

The Nostr Commerce Framework includes support for [Nostr Wallet Connect (NWC)](https://nwc.dev/), enabling seamless integration with Lightning wallets that support the NWC protocol.

## Overview

Nostr Wallet Connect allows web applications to interact with Lightning wallets using Nostr as a secure communication channel. This integration enables:

- Direct Lightning payments through user's preferred wallet
- No need to manage Lightning nodes
- Secure, end-to-end encrypted communication
- Support for multiple wallet providers

## Usage

### Basic Setup

```typescript
import { NostrCommerce } from 'nostr-commerce-framework';
import { NostrWalletConnect } from 'nostr-commerce-framework/nwc';

// Initialize the framework
const framework = new NostrCommerce({
  relays: ['wss://relay.damus.io'],
  publicKey: 'your-public-key',
  privateKey: 'your-private-key'
});

// Initialize NWC
const nwc = new NostrWalletConnect({
  relayUrl: 'wss://relay.damus.io'
});

// Connect to wallet
await nwc.connect('wallet-pubkey');
```

### Making Payments

```typescript
// Create an invoice payment
const payment = await nwc.payInvoice({
  amount: 1000,  // Amount in sats
  invoice: 'lnbc...', // BOLT11 invoice
  comment: 'Payment for product'  // Optional comment
});

console.log('Payment successful:', payment);
// {
//   preimage: '...',
//   paymentHash: '...',
//   amount: 1000,
//   timestamp: 1678901234
// }
```

### Event Handling

```typescript
// Listen for connection events
nwc.on('connected', (info) => {
  console.log('Connected to wallet:', info);
});

// Listen for payment events
nwc.on('payment', (payment) => {
  console.log('Payment completed:', payment);
});

// Handle errors
nwc.on('error', (error) => {
  console.error('NWC error:', error);
});
```

### Integration with Commerce Module

```typescript
// Create a commerce instance with NWC support
const commerce = framework.commerce.withNWC(nwc);

// Create an invoice
const invoice = await commerce.createInvoice({
  amount: 1000,
  description: 'Product purchase'
});

// Payment will be handled through NWC
commerce.on('paymentReceived', (payment) => {
  console.log('Payment received:', payment);
});
```

## Wallet Support

The following wallets currently support NWC:

- Alby
- Mutiny Wallet
- Snort.social
- More coming soon...

## Security Considerations

1. **Key Management**
   - NWC uses separate keypairs for each connection
   - Keys should be stored securely
   - Consider implementing key rotation

2. **Relay Selection**
   - Use reliable relays for NWC communication
   - Consider using multiple relays for redundancy
   - Monitor relay health and performance

3. **Payment Verification**
   - Always verify payment completion
   - Check payment amounts match expected values
   - Implement proper error handling

## Error Handling

```typescript
try {
  await nwc.payInvoice({
    amount: 1000,
    invoice: 'lnbc...'
  });
} catch (error) {
  if (error.message === 'Not connected to wallet') {
    // Handle connection error
  } else if (error.message === 'Payment timeout') {
    // Handle timeout
  } else {
    // Handle other errors
  }
}
```

## Best Practices

1. **Connection Management**
   ```typescript
   // Implement reconnection logic
   nwc.on('disconnected', async () => {
     try {
       await nwc.connect(walletPubkey);
     } catch (error) {
       console.error('Reconnection failed:', error);
     }
   });
   ```

2. **Payment Timeouts**
   ```typescript
   // Configure custom timeout
   const payment = await nwc.payInvoice({
     amount: 1000,
     invoice: 'lnbc...',
     timeout: 120000  // 2 minutes
   });
   ```

3. **Error Recovery**
   ```typescript
   // Implement retry logic
   async function retryPayment(invoice, maxAttempts = 3) {
     for (let i = 0; i < maxAttempts; i++) {
       try {
         return await nwc.payInvoice(invoice);
       } catch (error) {
         if (i === maxAttempts - 1) throw error;
         await new Promise(r => setTimeout(r, 1000 * (i + 1)));
       }
     }
   }
   ```

## Examples

### E-commerce Integration

```typescript
class ProductCheckout {
  constructor(private nwc: NostrWalletConnect) {}

  async processOrder(order: Order) {
    // Create invoice
    const invoice = await this.createInvoice(order);

    // Process payment through NWC
    try {
      const payment = await this.nwc.payInvoice({
        amount: order.amount,
        invoice: invoice.bolt11,
        comment: `Order #${order.id}`
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
  constructor(private nwc: NostrWalletConnect) {}

  async processSubscription(sub: Subscription) {
    // Handle recurring payments
    this.nwc.on('payment', (payment) => {
      if (payment.amount === sub.amount) {
        this.extendSubscription(sub, payment);
      }
    });
  }
}
```

## Testing

```typescript
describe('NostrWalletConnect', () => {
  let nwc: NostrWalletConnect;

  beforeEach(() => {
    nwc = new NostrWalletConnect({
      relayUrl: 'wss://relay.damus.io'
    });
  });

  it('should connect to wallet', async () => {
    await nwc.connect('test-pubkey');
    expect(nwc.isConnected()).toBe(true);
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

## Troubleshooting

Common issues and solutions:

1. **Connection Issues**
   - Check relay connectivity
   - Verify wallet public key
   - Ensure proper key permissions

2. **Payment Failures**
   - Verify invoice validity
   - Check wallet balance
   - Confirm relay messages

3. **Timeout Errors**
   - Adjust timeout settings
   - Check network connectivity
   - Verify relay responsiveness

## Resources

- [NWC Protocol Specification](https://nwc.dev/docs)
- [NWC GitHub Repository](https://github.com/nostr-protocol/nwc)
- [Nostr NIPs](https://github.com/nostr-protocol/nips)