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

// Create NWC connection with options
const nwc = new NostrWalletConnect({
  connectionString: 'nostr+walletconnect://...', // From user's wallet
  appName: 'My Commerce App',
  timeout: 30000, // Optional: custom timeout in milliseconds (default: 30000)
  supportedMethods: [ // Optional: specify supported methods
    'pay_invoice',
    'get_balance',
    'get_info',
    'list_transactions',
    'make_invoice'
  ]
});

// Connect to wallet
const info = await nwc.connect();
console.log('Connected to wallet:', info.name);
console.log('Supported methods:', info.supportedMethods);

// Make a payment
const paymentHash = await nwc.payInvoice(bolt11String);
```

## Connection Setup

### 1. Configuration Options

The `NostrWalletConnect` constructor accepts the following options:

```typescript
interface NWCConnectionOptions {
  connectionString: string;  // Required: NWC connection string
  appName: string;          // Required: Your application name
  timeout?: number;         // Optional: Request timeout in ms (default: 30000)
  supportedMethods?: string[]; // Optional: List of supported methods
}
```

### 2. Get Connection String

Users can provide their NWC connection string in several ways:
- Scanning a QR code
- Clicking a deep link
- Pasting the connection string

The connection string format is:
```
nostr+walletconnect://<pubkey>?relay=<relay_url>&secret=<secret>
```

Example:
```typescript
// Example of handling connection string input
function handleConnectionString(input: string) {
  try {
    const nwc = new NostrWalletConnect({
      connectionString: input,
      appName: 'My Commerce App'
    });
    
    // Validate connection details
    const details = nwc.getConnectionDetails();
    console.log('Pubkey:', details.pubkey);
    console.log('Relay:', details.relayUrl);
    
    return nwc;
  } catch (error) {
    console.error('Invalid connection string:', error);
  }
}
```

### 3. Initialize Connection

Always check supported methods and initialize properly:

```typescript
async function initializeWallet(nwc: NostrWalletConnect) {
  try {
    // Connect and get wallet info
    const info = await nwc.connect();
    
    // Check supported methods
    const supported = info.supportedMethods;
    console.log('Wallet name:', info.name);
    console.log('Pubkey:', info.pubkey);
    console.log('Supported methods:', supported);
    
    return info;
  } catch (error) {
    if (error.message === 'Request timeout') {
      console.error('Connection timed out');
    } else if (error.message === 'WebSocket not connected') {
      console.error('Failed to connect to relay');
    } else {
      console.error('Connection failed:', error);
    }
  }
}
```

## Payment Operations

### Making Payments

```typescript
// Pay a Lightning invoice
async function payInvoice(nwc: NostrWalletConnect, bolt11: string, options?: { amount?: number }) {
  try {
    const paymentHash = await nwc.payInvoice(bolt11, options);
    return paymentHash;
  } catch (error) {
    if (error.message === 'Request timeout') {
      console.error('Payment timed out');
    } else if (error.message === 'Not connected') {
      console.error('Wallet not connected');
    } else {
      console.error('Payment failed:', error);
    }
  }
}
```

### Creating Invoices

```typescript
interface InvoiceOptions {
  amount: number;
  description: string;
  expiry?: number;  // Optional: expiry time in seconds
}

// Create a Lightning invoice
async function createInvoice(nwc: NostrWalletConnect, options: InvoiceOptions) {
  try {
    const bolt11 = await nwc.makeInvoice(options);
    return bolt11;
  } catch (error) {
    if (error.message === 'Request timeout') {
      console.error('Invoice creation timed out');
    } else if (error.message === 'Not connected') {
      console.error('Wallet not connected');
    } else {
      console.error('Invoice creation failed:', error);
    }
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
    if (error.message === 'Request timeout') {
      console.error('Balance check timed out');
    } else if (error.message === 'Not connected') {
      console.error('Wallet not connected');
    } else {
      console.error('Balance check failed:', error);
    }
  }
}
```

### Transaction History

```typescript
interface TransactionOptions {
  limit?: number;   // Optional: number of transactions to return
  offset?: number;  // Optional: offset for pagination
}

async function getTransactions(nwc: NostrWalletConnect, options?: TransactionOptions) {
  try {
    const transactions = await nwc.listTransactions(options);
    return transactions;
  } catch (error) {
    if (error.message === 'Request timeout') {
      console.error('Transaction list request timed out');
    } else if (error.message === 'Not connected') {
      console.error('Wallet not connected');
    } else {
      console.error('Failed to get transactions:', error);
    }
  }
}
```

## Best Practices

### 1. Connection Management
- Set appropriate timeouts for your use case
- Handle connection errors gracefully
- Implement reconnection logic
- Clean up resources on disconnect

```typescript
class NWCManager {
  private nwc: NostrWalletConnect;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 3;
  
  constructor(connectionString: string) {
    this.nwc = new NostrWalletConnect({
      connectionString,
      appName: 'My Commerce App',
      timeout: 10000, // 10 second timeout
    });
    
    // Listen for disconnection
    this.nwc.on('disconnected', () => {
      this.handleDisconnect();
    });
  }
  
  private async handleDisconnect() {
    if (this.reconnectAttempts < this.maxReconnectAttempts) {
      this.reconnectAttempts++;
      try {
        await this.nwc.connect();
        this.reconnectAttempts = 0;
      } catch (error) {
        console.error('Reconnection failed:', error);
      }
    }
  }
  
  disconnect() {
    this.nwc.disconnect();
    this.reconnectAttempts = 0;
  }
}
```

### 2. Error Handling
- Handle all possible error types:
  - Connection errors
  - Timeout errors
  - Payment errors
  - WebSocket errors
- Implement retry logic for transient errors
- Provide clear error messages to users

```typescript
async function safeOperation<T>(
  operation: () => Promise<T>,
  options: {
    retries?: number;
    timeout?: number;
    onError?: (error: Error, attempt: number) => void;
  } = {}
): Promise<T> {
  const {
    retries = 3,
    timeout = 5000,
    onError
  } = options;

  for (let i = 0; i < retries; i++) {
    try {
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('Operation timeout')), timeout);
      });
      
      return await Promise.race([
        operation(),
        timeoutPromise
      ]);
    } catch (error) {
      if (onError) onError(error, i + 1);
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
- Validate all inputs and responses

```typescript
class SecureNWCHandler {
  private nwc: NostrWalletConnect;
  private readonly secureStorage: Storage;
  
  constructor(storage: Storage) {
    this.secureStorage = storage;
  }
  
  async connect(connectionString: string) {
    // Validate connection string
    if (!this.isValidConnectionString(connectionString)) {
      throw new Error('Invalid connection string');
    }
    
    // Store connection string securely
    await this.secureStorage.setItem(
      'nwc_connection',
      this.encryptConnectionString(connectionString)
    );
    
    this.nwc = new NostrWalletConnect({
      connectionString,
      appName: 'My Commerce App',
      timeout: 30000
    });
    
    return await this.nwc.connect();
  }
  
  disconnect() {
    if (this.nwc) {
      this.nwc.disconnect();
      this.nwc = null;
    }
    // Clear sensitive data
    this.secureStorage.removeItem('nwc_connection');
  }
  
  private isValidConnectionString(str: string): boolean {
    if (!str.startsWith('nostr+walletconnect://')) return false;
    
    try {
      const url = new URL(str);
      const params = new URLSearchParams(url.search);
      
      // Check required parameters
      if (!params.get('relay')) return false;
      if (!params.get('secret')) return false;
      
      // Validate pubkey format
      const pubkey = url.pathname.replace(/^\/+/, '');
      if (!/^[0-9a-f]{64}$/.test(pubkey)) return false;
      
      return true;
    } catch {
      return false;
    }
  }
  
  private encryptConnectionString(str: string): string {
    // Implement secure encryption
    return str;
  }
}
```

### 4. User Experience
- Provide clear connection status
- Show payment progress
- Handle offline scenarios
- Support connection recovery
- Implement proper error messages

```typescript
class NWCInterface {
  private nwc: NostrWalletConnect;
  private status: 'disconnected' | 'connecting' | 'connected' = 'disconnected';
  private eventHandlers: Set<(status: string) => void> = new Set();
  
  constructor() {
    this.nwc = null;
  }
  
  async connect(connectionString: string) {
    this.updateStatus('connecting');
    try {
      this.nwc = new NostrWalletConnect({
        connectionString,
        appName: 'My Commerce App',
        timeout: 30000
      });
      
      this.nwc.on('disconnected', () => {
        this.updateStatus('disconnected');
      });
      
      await this.nwc.connect();
      this.updateStatus('connected');
    } catch (error) {
      this.updateStatus('disconnected');
      throw this.formatError(error);
    }
  }
  
  async pay(bolt11: string, options?: { amount?: number }) {
    try {
      const paymentHash = await this.nwc.payInvoice(bolt11, options);
      return { success: true, paymentHash };
    } catch (error) {
      return {
        success: false,
        error: this.formatError(error)
      };
    }
  }
  
  onStatusChange(handler: (status: string) => void) {
    this.eventHandlers.add(handler);
    return () => this.eventHandlers.delete(handler);
  }
  
  private updateStatus(newStatus: string) {
    this.status = newStatus;
    this.eventHandlers.forEach(handler => handler(newStatus));
  }
  
  private formatError(error: Error): string {
    switch (error.message) {
      case 'Request timeout':
        return 'The operation timed out. Please try again.';
      case 'Not connected':
        return 'Not connected to wallet. Please reconnect.';
      case 'WebSocket not connected':
        return 'Connection lost. Please check your internet connection.';
      default:
        return `An error occurred: ${error.message}`;
    }
  }
}
```

## Integration Examples

### E-commerce Checkout

```typescript
class NWCCheckout {
  private nwc: NostrWalletConnect;
  private readonly timeout: number;
  
  constructor(options: { timeout?: number } = {}) {
    this.timeout = options.timeout || 300000; // 5 minutes default
  }
  
  async processPayment(amount: number, description: string) {
    // Create invoice with expiry
    const bolt11 = await this.nwc.makeInvoice({
      amount,
      description,
      expiry: Math.floor(this.timeout / 1000)
    });
    
    // Set up payment monitoring
    const paymentPromise = this.nwc.payInvoice(bolt11);
    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => reject(new Error('Payment timeout')), this.timeout);
    });
    
    try {
      // Wait for payment with timeout
      const paymentHash = await Promise.race([
        paymentPromise,
        timeoutPromise
      ]);
      
      return {
        success: true,
        bolt11,
        paymentHash,
        status: 'paid'
      };
    } catch (error) {
      return {
        success: false,
        bolt11,
        error: error.message,
        status: 'failed'
      };
    }
  }
}
```

### Subscription Handling

```typescript
interface SubscriptionPlan {
  amount: number;
  interval: 'monthly' | 'yearly';
  description: string;
}

class NWCSubscription {
  private nwc: NostrWalletConnect;
  private readonly plans: Map<string, SubscriptionPlan>;
  
  constructor() {
    this.plans = new Map();
  }
  
  addPlan(id: string, plan: SubscriptionPlan) {
    this.plans.set(id, plan);
  }
  
  async setupSubscription(planId: string) {
    const plan = this.plans.get(planId);
    if (!plan) throw new Error('Invalid plan');
    
    // Create initial invoice
    const bolt11 = await this.nwc.makeInvoice({
      amount: plan.amount,
      description: `${plan.description} (${plan.interval} subscription)`,
      expiry: 3600
    });
    
    // Process initial payment
    try {
      const paymentHash = await this.nwc.payInvoice(bolt11);
      
      // Store subscription details
      const subscription = {
        id: crypto.randomUUID(),
        planId,
        startDate: new Date(),
        nextBillingDate: this.calculateNextBillingDate(plan.interval),
        status: 'active',
        lastPayment: {
          date: new Date(),
          amount: plan.amount,
          hash: paymentHash
        }
      };
      
      return subscription;
    } catch (error) {
      throw new Error(`Subscription setup failed: ${error.message}`);
    }
  }
  
  private calculateNextBillingDate(interval: string): Date {
    const date = new Date();
    if (interval === 'monthly') {
      date.setMonth(date.getMonth() + 1);
    } else {
      date.setFullYear(date.getFullYear() + 1);
    }
    return date;
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
    return {
      connected: true,
      status: 'Connected to relay'
    };
  } catch (error) {
    let reason = 'Unknown error';
    
    if (error.message === 'WebSocket not connected') {
      reason = 'Failed to connect to relay';
    } else if (error.message === 'Request timeout') {
      reason = 'Relay connection timed out';
    }
    
    return {
      connected: false,
      status: `Connection failed: ${reason}`
    };
  }
}
```

2. Payment Timeouts
```typescript
// Implement payment monitoring with progress
async function monitorPayment(nwc: NostrWalletConnect, bolt11: string) {
  let attempts = 0;
  const maxAttempts = 3;
  const timeout = 30000; // 30 seconds
  
  while (attempts < maxAttempts) {
    try {
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('Payment timeout')), timeout);
      });
      
      const hash = await Promise.race([
        nwc.payInvoice(bolt11),
        timeoutPromise
      ]);
      
      return {
        success: true,
        paymentHash: hash
      };
    } catch (error) {
      attempts++;
      if (attempts === maxAttempts) {
        return {
          success: false,
          error: error.message,
          attempts
        };
      }
      // Wait before retrying
      await new Promise(r => setTimeout(r, 1000));
    }
  }
}
```

3. Reconnection Handling
```typescript
class NWCReconnector {
  private nwc: NostrWalletConnect;
  private connectionString: string;
  private maxAttempts: number;
  private backoffMs: number;
  private reconnecting: boolean;
  
  constructor(options: {
    connectionString: string;
    maxAttempts?: number;
    backoffMs?: number;
  }) {
    this.connectionString = options.connectionString;
    this.maxAttempts = options.maxAttempts || 3;
    this.backoffMs = options.backoffMs || 1000;
    this.reconnecting = false;
  }
  
  async connect() {
    this.nwc = new NostrWalletConnect({
      connectionString: this.connectionString,
      appName: 'My Commerce App',
      timeout: 30000
    });
    
    this.nwc.on('disconnected', () => {
      if (!this.reconnecting) {
        this.reconnecting = true;
        this.attemptReconnect();
      }
    });
    
    return this.nwc.connect();
  }
  
  private async attemptReconnect() {
    let attempts = 0;
    while (attempts < this.maxAttempts) {
      try {
        await this.nwc.connect();
        this.reconnecting = false;
        return;
      } catch (error) {
        attempts++;
        if (attempts === this.maxAttempts) {
          this.reconnecting = false;
          throw new Error('Reconnection failed after max attempts');
        }
        await new Promise(r => setTimeout(r, this.backoffMs * attempts));
      }
    }
  }
}
```

4. Event Handling
```typescript
class NWCEventHandler {
  private nwc: NostrWalletConnect;
  private handlers: Map<string, Set<Function>>;
  
  constructor(nwc: NostrWalletConnect) {
    this.nwc = nwc;
    this.handlers = new Map();
    
    // Listen for NWC events
    this.nwc.on('event', this.handleEvent.bind(this));
  }
  
  on(event: string, handler: Function) {
    if (!this.handlers.has(event)) {
      this.handlers.set(event, new Set());
    }
    this.handlers.get(event).add(handler);
  }
  
  off(event: string, handler: Function) {
    if (this.handlers.has(event)) {
      this.handlers.get(event).delete(handler);
    }
  }
  
  private handleEvent(event: any) {
    const handlers = this.handlers.get(event.type);
    if (handlers) {
      handlers.forEach(handler => {
        try {
          handler(event);
        } catch (error) {
          console.error('Event handler error:', error);
        }
      });
    }
  }
}
```