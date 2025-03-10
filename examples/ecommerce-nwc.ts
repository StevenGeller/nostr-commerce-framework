import { NostrCommerce } from '../src';
import { NostrWalletConnect } from '../src/nwc';

// Example e-commerce application using NWC
class EcommerceApp {
  private framework: NostrCommerce;
  private nwc: NostrWalletConnect;
  private products: Map<string, Product>;

  constructor() {
    // Initialize the framework
    this.framework = new NostrCommerce({
      relays: [
        'wss://relay.damus.io',
        'wss://relay.primal.net'
      ],
      publicKey: process.env.PUBLIC_KEY!,
      privateKey: process.env.PRIVATE_KEY!
    });

    // Initialize NWC
    this.nwc = new NostrWalletConnect({
      relayUrl: 'wss://relay.damus.io',
      autoReconnect: true,
      maxRetries: 3
    });

    // Initialize product catalog
    this.products = new Map();
    this.setupProducts();
    this.setupEventHandlers();
  }

  private setupProducts() {
    this.products.set('product1', {
      id: 'product1',
      name: 'Digital Download',
      price: 1000,
      description: 'Example digital product'
    });
  }

  private setupEventHandlers() {
    // Handle NWC connection events
    this.nwc.on('connected', (info) => {
      console.log('Connected to wallet:', info);
      this.checkWalletCapabilities(info.capabilities);
    });

    this.nwc.on('disconnected', () => {
      console.log('Disconnected from wallet');
    });

    this.nwc.on('error', (error) => {
      console.error('NWC error:', error);
    });

    // Handle payment events
    this.framework.commerce.on('paymentReceived', (payment) => {
      console.log('Payment received:', payment);
      this.handlePaymentReceived(payment);
    });
  }

  private checkWalletCapabilities(capabilities: any) {
    if (!capabilities.payInvoice) {
      console.warn('Wallet does not support paying invoices');
    }
    if (!capabilities.createInvoice) {
      console.warn('Wallet does not support creating invoices');
    }
  }

  async start() {
    await this.framework.start();
    console.log('E-commerce application started');
  }

  async connectWallet(walletPubkey: string) {
    try {
      const info = await this.nwc.connect(walletPubkey);
      console.log('Wallet connected:', info);
      return info;
    } catch (error) {
      console.error('Failed to connect wallet:', error);
      throw error;
    }
  }

  async createOrder(productId: string, customerInfo: CustomerInfo): Promise<Order> {
    const product = this.products.get(productId);
    if (!product) {
      throw new Error('Product not found');
    }

    const order: Order = {
      id: `order-${Date.now()}`,
      productId,
      amount: product.price,
      customerInfo,
      status: 'pending',
      createdAt: new Date()
    };

    try {
      // Create invoice
      const invoice = await this.framework.commerce.createInvoice({
        amount: order.amount,
        description: `Order ${order.id} - ${product.name}`
      });

      order.invoice = invoice;
      return order;
    } catch (error) {
      console.error('Failed to create order:', error);
      throw error;
    }
  }

  async processPayment(order: Order): Promise<PaymentResult> {
    if (!this.nwc.isConnected()) {
      throw new Error('Wallet not connected');
    }

    try {
      // Process payment through NWC
      const payment = await this.nwc.payInvoice({
        amount: order.amount,
        invoice: order.invoice!,
        comment: `Payment for order ${order.id}`,
        externalId: order.id
      });

      return {
        orderId: order.id,
        status: 'success',
        paymentHash: payment.paymentHash,
        amount: payment.amount,
        timestamp: payment.timestamp
      };
    } catch (error) {
      console.error('Payment failed:', error);
      return {
        orderId: order.id,
        status: 'failed',
        error: error.message
      };
    }
  }

  private async handlePaymentReceived(payment: any) {
    const orderId = payment.externalId;
    if (!orderId) return;

    try {
      // Verify payment amount matches order
      // Process order fulfillment
      // Update order status
      // Send confirmation to customer
      console.log('Processing order fulfillment:', orderId);
    } catch (error) {
      console.error('Failed to process order fulfillment:', error);
    }
  }

  async getWalletInfo(): Promise<any> {
    if (!this.nwc.isConnected()) {
      throw new Error('Wallet not connected');
    }

    try {
      const info = await this.nwc.getInfo();
      console.log('Wallet info:', info);
      return info;
    } catch (error) {
      console.error('Failed to get wallet info:', error);
      throw error;
    }
  }

  async disconnect() {
    await this.nwc.disconnect();
    await this.framework.stop();
    console.log('E-commerce application stopped');
  }
}

// Types
interface Product {
  id: string;
  name: string;
  price: number;
  description: string;
}

interface CustomerInfo {
  email: string;
  name: string;
}

interface Order {
  id: string;
  productId: string;
  amount: number;
  customerInfo: CustomerInfo;
  status: 'pending' | 'paid' | 'fulfilled' | 'failed';
  createdAt: Date;
  invoice?: string;
}

interface PaymentResult {
  orderId: string;
  status: 'success' | 'failed';
  paymentHash?: string;
  amount?: number;
  timestamp?: number;
  error?: string;
}

// Usage example
async function main() {
  const app = new EcommerceApp();
  
  try {
    await app.start();

    // Connect to customer's wallet
    await app.connectWallet('customer-wallet-pubkey');

    // Create an order
    const order = await app.createOrder('product1', {
      email: 'customer@example.com',
      name: 'John Doe'
    });

    // Process payment
    const result = await app.processPayment(order);
    console.log('Payment result:', result);

    if (result.status === 'success') {
      console.log('Order completed successfully');
    } else {
      console.log('Order failed:', result.error);
    }
  } catch (error) {
    console.error('Application error:', error);
  } finally {
    await app.disconnect();
  }
}

// Run the example
if (require.main === module) {
  main().catch(console.error);
}