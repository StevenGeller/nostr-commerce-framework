# Nostr Wallet Connect Integration

This guide explains how to use Nostr Wallet Connect (NWC) with the Nostr Commerce Framework.

## Overview

NWC allows your application to connect with users' bitcoin wallets through Nostr, providing:
- Payment processing
- Balance checking
- Transaction history
- Invoice creation
- Real-time payment notifications

## Quick Start

```typescript
import { NostrCommerce } from 'nostr-commerce-framework';
import { NostrWalletConnect } from 'nostr-commerce-framework/nwc';

// Initialize the framework
const framework = new NostrCommerce({
  // ... framework config
});

// Create NWC connection
const nwc = new NostrWalletConnect({
  connectionString: 'nostr+walletconnect://...', // From user's wallet
  appName: 'My Commerce App'
});

// Connect to wallet
const info = await nwc.connect();
console.log('Connected to wallet:', info.name);

// Make a payment
const paymentHash = await nwc.payInvoice(bolt11String);
```

## Connection Setup

### 1. Get Connection String

Users can provide their NWC connection string in several ways:
- Scanning a QR code
- Clicking a deep link
- Pasting the connection string

```typescript
// Example of handling connection string input
function handleConnectionString(input: string) {
  try {
    const nwc = new NostrWalletConnect({
      connectionString: input,
      appName: 'My Commerce App'
    });
    return nwc;
  } catch (error) {
    console.error('Invalid connection string:', error);
  }
}
```

### 2. Initialize Connection

Always check supported methods and initialize properly:

```typescript
async function initializeWallet(nwc: NostrWalletConnect) {
  try {
    // Connect and get wallet info
    const info = await nwc.connect();
    
    // Check supported methods
    const supported = info.supportedMethods;
    console.log('Supported methods:', supported);
    
    return info;
  } catch (error) {
    console.error('Connection failed:', error);
  }
}
```

## Payment Operations

### Making Payments

```typescript
// Pay a Lightning invoice
async function payInvoice(nwc: NostrWalletConnect, bolt11: string) {
  try {
    const paymentHash = await nwc.payInvoice(bolt11);
    return paymentHash;
  } catch (error) {
    console.error('Payment failed:', error);
  }
}
```

### Creating Invoices

```typescript
// Create a Lightning invoice
async function createInvoice(nwc: NostrWalletConnect, amount: number) {
  try {
    const bolt11 = await nwc.makeInvoice({
      amount,
      description: 'Product purchase',
      expiry: 3600 // 1 hour
    });
    return bolt11;
  } catch (error) {
    console.error('Invoice creation failed:', error);
  }
}
```

### Checking Balance

```typescript
async function checkBalance(nwc: NostrWalletConnect) {
  try {
    const { balance } = await nwc.getBalance();
    return balance;
  } catch (error) {
    console.error('Balance check failed:', error);
  }
}
```

### Transaction History

```typescript
async function getTransactions(nwc: NostrWalletConnect) {
  try {
    const transactions = await nwc.listTransactions({
      limit: 10,
      offset: 0
    });
    return transactions;
  } catch (error) {
    console.error('Failed to get transactions:', error);
  }
}
```

## Best Practices

### 1. Permission Handling
- Only request necessary permissions
- Check supported methods before using them
- Handle permission denials gracefully

```typescript
async function checkPermissions(nwc: NostrWalletConnect) {
  const info = await nwc.getInfo();
  const canPay = info.supportedMethods.includes('pay_invoice');
  const canCreateInvoice = info.supportedMethods.includes('make_invoice');
  
  return { canPay, canCreateInvoice };
}
```

### 2. Error Handling
- Handle connection failures
- Implement retry logic for timeouts
- Provide clear error messages to users

```typescript
async function safeOperation<T>(
  operation: () => Promise<T>,
  retries = 3
): Promise<T> {
  for (let i = 0; i < retries; i++) {
    try {
      return await operation();
    } catch (error) {
      if (i === retries - 1) throw error;
      await new Promise(r => setTimeout(r, 1000 * (i + 1)));
    }
  }
}
```

### 3. Security Considerations
- Store connection strings securely
- Use password fields for connection string input
- Implement proper session management
- Clear sensitive data on disconnect

```typescript
class SecureNWCHandler {
  private nwc: NostrWalletConnect;
  
  async connect(connectionString: string) {
    // Validate connection string
    if (!this.isValidConnectionString(connectionString)) {
      throw new Error('Invalid connection string');
    }
    
    this.nwc = new NostrWalletConnect({
      connectionString,
      appName: 'My Commerce App'
    });
    
    return await this.nwc.connect();
  }
  
  disconnect() {
    if (this.nwc) {
      this.nwc.disconnect();
      this.nwc = null;
    }
  }
  
  private isValidConnectionString(str: string): boolean {
    return str.startsWith('nostr+walletconnect://');
  }
}
```

### 4. User Experience
- Provide clear connection status
- Show payment progress
- Handle offline scenarios
- Support connection recovery

```typescript
class NWCInterface {
  private nwc: NostrWalletConnect;
  private status: 'disconnected' | 'connecting' | 'connected' = 'disconnected';
  
  async connect(connectionString: string) {
    this.status = 'connecting';
    try {
      this.nwc = new NostrWalletConnect({
        connectionString,
        appName: 'My Commerce App'
      });
      await this.nwc.connect();
      this.status = 'connected';
    } catch (error) {
      this.status = 'disconnected';
      throw error;
    }
  }
  
  getStatus() {
    return this.status;
  }
}
```

## Integration Examples

### E-commerce Checkout

```typescript
class NWCCheckout {
  private nwc: NostrWalletConnect;
  
  async processPayment(amount: number, description: string) {
    // Create invoice
    const bolt11 = await this.nwc.makeInvoice({
      amount,
      description,
      expiry: 3600
    });
    
    // Wait for payment
    const paymentHash = await this.nwc.payInvoice(bolt11);
    
    return {
      bolt11,
      paymentHash,
      status: 'paid'
    };
  }
}
```

### Subscription Handling

```typescript
class NWCSubscription {
  private nwc: NostrWalletConnect;
  
  async setupSubscription(plan: {
    amount: number,
    interval: 'monthly' | 'yearly'
  }) {
    // Create initial invoice
    const bolt11 = await this.nwc.makeInvoice({
      amount: plan.amount,
      description: `${plan.interval} subscription`,
      expiry: 3600
    });
    
    // Process payment
    const paymentHash = await this.nwc.payInvoice(bolt11);
    
    // Store subscription details
    return {
      startDate: new Date(),
      plan,
      paymentHash
    };
  }
}
```

## Troubleshooting

### Common Issues

1. Connection Failures
```typescript
// Check relay connectivity
async function checkRelayConnection(nwc: NostrWalletConnect) {
  try {
    await nwc.getInfo();
    return true;
  } catch (error) {
    console.error('Relay connection failed:', error);
    return false;
  }
}
```

2. Payment Timeouts
```typescript
// Implement payment monitoring
async function monitorPayment(nwc: NostrWalletConnect, bolt11: string) {
  const timeout = setTimeout(() => {
    throw new Error('Payment timeout');
  }, 60000);
  
  try {
    const hash = await nwc.payInvoice(bolt11);
    clearTimeout(timeout);
    return hash;
  } catch (error) {
    clearTimeout(timeout);
    throw error;
  }
}
```

3. Reconnection Handling
```typescript
// Implement reconnection logic
class NWCReconnector {
  private nwc: NostrWalletConnect;
  private connectionString: string;
  
  async reconnect() {
    try {
      this.nwc = new NostrWalletConnect({
        connectionString: this.connectionString,
        appName: 'My Commerce App'
      });
      await this.nwc.connect();
    } catch (error) {
      console.error('Reconnection failed:', error);
      throw error;
    }
  }
}
```