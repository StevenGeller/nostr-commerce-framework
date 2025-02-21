# Commerce Integration Guide

This guide provides detailed information on integrating payment processing capabilities using the Nostr Commerce Framework. It covers Bitcoin, Lightning Network, and Nostr Zaps integration, along with best practices for handling payments.

## Table of Contents

1. [Overview](#overview)
2. [Payment Methods](#payment-methods)
3. [Integration Steps](#integration-steps)
4. [API Reference](#api-reference)
5. [Examples](#examples)
6. [Best Practices](#best-practices)

## Overview

The Nostr Commerce Framework provides a unified interface for handling various cryptocurrency payment methods. The commerce module supports:

- Bitcoin on-chain transactions
- Lightning Network payments
- Nostr Zaps
- Custom payment methods via plugins

### Architecture

```
┌─────────────────────────┐
│    Commerce Manager     │
├─────────────┬───────────┤
│  Payment    │  Invoice  │
│  Processor  │  Manager  │
└─────────────┴───────────┘
        ▲           ▲
        │           │
┌─────────────────────────┐
│    Payment Providers    │
├────────┬────────┬───────┤
│Bitcoin │Lightning│ Zaps │
└────────┴────────┴───────┘
```

## Payment Methods

### 1. Bitcoin Integration

```typescript
import { BitcoinPaymentProvider } from '@nostr-commerce/core';

// Initialize Bitcoin payment provider
const bitcoinProvider = new BitcoinPaymentProvider({
  network: 'mainnet',
  // Additional configuration
});

// Create an invoice
const invoice = await bitcoinProvider.createInvoice({
  amount: 100000, // Amount in satoshis
  description: 'Product purchase',
  expiresIn: 3600 // 1 hour
});
```

### 2. Lightning Network

```typescript
import { LightningPaymentProvider } from '@nostr-commerce/core';

// Initialize Lightning payment provider
const lightningProvider = new LightningPaymentProvider({
  nodeUrl: 'your-ln-node-url',
  macaroon: 'your-macaroon'
});

// Create a Lightning invoice
const invoice = await lightningProvider.createInvoice({
  amount: 50000,
  description: 'Lightning payment',
  expiresIn: 1800 // 30 minutes
});
```

### 3. Nostr Zaps

```typescript
import { ZapsPaymentProvider } from '@nostr-commerce/core';

// Initialize Zaps provider
const zapsProvider = new ZapsPaymentProvider({
  relays: ['wss://relay.example.com'],
  publicKey: 'your-public-key'
});

// Create a Zap invoice
const zapInvoice = await zapsProvider.createInvoice({
  amount: 21000,
  description: 'Content support',
  recipient: 'recipient-public-key'
});
```

## Integration Steps

### 1. Basic Setup

```typescript
import { NostrCommerce, CommerceManager } from '@nostr-commerce/core';

// Initialize the framework
const framework = new NostrCommerce({
  // Framework configuration
});

// Get commerce manager instance
const commerce = framework.commerce;
```

### 2. Configure Payment Methods

```typescript
// Configure payment methods
await commerce.configurePaymentMethods({
  bitcoin: {
    enabled: true,
    network: 'mainnet',
    // Additional Bitcoin configuration
  },
  lightning: {
    enabled: true,
    nodeUrl: process.env.LIGHTNING_NODE_URL,
    macaroon: process.env.LIGHTNING_MACAROON,
    // Additional Lightning configuration
  },
  zaps: {
    enabled: true,
    relays: ['wss://relay.example.com'],
    // Additional Zaps configuration
  }
});
```

### 3. Create Invoices

```typescript
// Create a new invoice
const invoice = await commerce.createInvoice({
  amount: 100000, // Amount in satoshis
  currency: 'BTC',
  description: 'Product purchase',
  paymentMethods: ['bitcoin', 'lightning', 'zaps'],
  metadata: {
    orderId: 'order-123',
    productId: 'prod-456'
  }
});
```

### 4. Handle Payments

```typescript
// Listen for payment events
commerce.on('paymentReceived', async (payment) => {
  // Validate payment
  if (await commerce.verifyPayment(payment)) {
    // Process order
    await processOrder(payment.metadata.orderId);
    
    // Send confirmation
    await sendConfirmation(payment);
  }
});
```

## API Reference

### CommerceManager

#### Methods

##### createInvoice()
Create a new payment invoice.

```typescript
interface InvoiceOptions {
  amount: number;
  currency: string;
  description: string;
  paymentMethods: string[];
  metadata?: any;
  expiresIn?: number;
}

const invoice = await commerce.createInvoice(options);
```

##### verifyPayment()
Verify a received payment.

```typescript
interface Payment {
  id: string;
  amount: number;
  currency: string;
  method: string;
  status: PaymentStatus;
  metadata: any;
}

const isValid = await commerce.verifyPayment(payment);
```

##### getPaymentStatus()
Check payment status.

```typescript
const status = await commerce.getPaymentStatus(paymentId);
```

### Events

#### paymentReceived
Emitted when a payment is received.

```typescript
commerce.on('paymentReceived', (payment) => {
  console.log('Payment received:', payment);
});
```

#### paymentConfirmed
Emitted when a payment is confirmed.

```typescript
commerce.on('paymentConfirmed', (payment) => {
  console.log('Payment confirmed:', payment);
});
```

## Examples

### 1. Basic Store Implementation

```typescript
import { NostrCommerce } from '@nostr-commerce/core';

class Store {
  private commerce: CommerceManager;

  constructor() {
    const framework = new NostrCommerce();
    this.commerce = framework.commerce;
    this.setupPaymentHandlers();
  }

  private setupPaymentHandlers() {
    this.commerce.on('paymentReceived', this.handlePayment);
    this.commerce.on('paymentConfirmed', this.fulfillOrder);
  }

  async createOrder(products: Product[]): Promise<Invoice> {
    const amount = this.calculateTotal(products);
    
    return await this.commerce.createInvoice({
      amount,
      currency: 'BTC',
      description: 'Store purchase',
      paymentMethods: ['bitcoin', 'lightning'],
      metadata: { products }
    });
  }

  private async handlePayment(payment: Payment) {
    if (await this.commerce.verifyPayment(payment)) {
      await this.updateOrderStatus(payment);
    }
  }

  private async fulfillOrder(payment: Payment) {
    await this.processOrder(payment.metadata);
    await this.sendConfirmation(payment);
  }
}
```

### 2. Subscription Service

```typescript
class SubscriptionService {
  private commerce: CommerceManager;

  constructor() {
    const framework = new NostrCommerce();
    this.commerce = framework.commerce;
    this.setupSubscriptionHandlers();
  }

  async createSubscription(userId: string, plan: Plan): Promise<Invoice> {
    return await this.commerce.createInvoice({
      amount: plan.price,
      currency: 'BTC',
      description: `${plan.name} Subscription`,
      paymentMethods: ['bitcoin', 'lightning', 'zaps'],
      metadata: {
        userId,
        planId: plan.id,
        type: 'subscription'
      }
    });
  }

  private async handleSubscriptionPayment(payment: Payment) {
    if (await this.commerce.verifyPayment(payment)) {
      await this.activateSubscription(payment.metadata);
    }
  }
}
```

## Best Practices

### 1. Payment Verification

```typescript
async function verifyPayment(payment: Payment): Promise<boolean> {
  // Verify payment amount
  if (!verifyAmount(payment)) return false;
  
  // Check payment method
  if (!isSupportedMethod(payment.method)) return false;
  
  // Verify transaction
  if (!await verifyTransaction(payment)) return false;
  
  return true;
}
```

### 2. Error Handling

```typescript
try {
  const invoice = await commerce.createInvoice(options);
} catch (error) {
  if (error instanceof PaymentError) {
    // Handle payment-specific error
    handlePaymentError(error);
  } else {
    // Handle general error
    handleError(error);
  }
}
```

### 3. Payment Monitoring

```typescript
class PaymentMonitor {
  private checkInterval: number = 60000; // 1 minute

  startMonitoring(paymentId: string) {
    const interval = setInterval(async () => {
      const status = await commerce.getPaymentStatus(paymentId);
      
      if (status === 'confirmed') {
        clearInterval(interval);
        await this.handleConfirmed(paymentId);
      } else if (status === 'expired') {
        clearInterval(interval);
        await this.handleExpired(paymentId);
      }
    }, this.checkInterval);
  }
}
```

### 4. Security Considerations

- Always verify payment amounts
- Implement rate limiting
- Use secure random numbers for IDs
- Validate all input data
- Monitor for suspicious activity
- Implement proper error handling
- Use secure communication channels
- Regular security audits