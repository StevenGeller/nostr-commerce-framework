import { EventEmitter } from 'events';
import { NostrEvent, CommerceModule, InvoiceOptions, TipOptions } from '../../types';
import { NostrError, ErrorCode } from '../../core/errors';
import { logger } from '../../core/logging';
import { validatePaymentAmount } from '../../core/validation';
import { NostrWalletConnect } from '../../nwc';

interface Order {
  id: string;
  items: OrderItem[];
  total: number;
  status: OrderStatus;
  customerPubkey: string;
  createdAt: number;
  updatedAt: number;
  metadata?: Record<string, any>;
}

interface OrderItem {
  id: string;
  quantity: number;
  price: number;
  metadata?: Record<string, any>;
}

type OrderStatus = 'pending' | 'paid' | 'fulfilled' | 'cancelled' | 'rejected';

export class CommerceManager extends EventEmitter implements CommerceModule {
  private orders: Map<string, Order> = new Map();
  private invoices: Map<string, { orderId: string; amount: number; paid: boolean }> = new Map();
  private nwc: NostrWalletConnect | null = null;

  constructor(private pubkey: string) {
    super();
  }

  /**
   * Connect to a Nostr Wallet
   */
  async connectWallet(connectionString: string): Promise<void> {
    try {
      this.nwc = new NostrWalletConnect({
        connectionString,
        appName: 'Nostr Commerce',
        supportedMethods: ['pay_invoice', 'make_invoice', 'get_balance']
      });

      await this.nwc.connect();
      
      this.nwc.on('disconnected', () => {
        this.emit('wallet:disconnected');
      });

      this.emit('wallet:connected');
    } catch (error) {
      logger.error('Failed to connect wallet', { error });
      throw new NostrError(
        ErrorCode.CONNECTION_FAILED,
        'Failed to connect to wallet',
        { error }
      );
    }
  }

  /**
   * Create a new order
   */
  async createOrder(items: OrderItem[], customerPubkey: string, metadata?: Record<string, any>): Promise<Order> {
    // Validate items
    if (!items || items.length === 0) {
      throw new NostrError(
        ErrorCode.INVALID_PARAMETER,
        'Order must contain at least one item'
      );
    }

    // Calculate total
    const total = items.reduce((sum, item) => sum + (item.price * item.quantity), 0);

    // Create order
    const order: Order = {
      id: crypto.randomUUID(),
      items,
      total,
      status: 'pending',
      customerPubkey,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      metadata
    };

    this.orders.set(order.id, order);
    this.emit('order:created', order);

    return order;
  }

  /**
   * Create an invoice for an order
   */
  async createInvoice(options: InvoiceOptions): Promise<string> {
    validatePaymentAmount(options.amount);

    if (!this.nwc) {
      throw new NostrError(
        ErrorCode.NOT_CONNECTED,
        'No wallet connected'
      );
    }

    try {
      const bolt11 = await this.nwc.makeInvoice({
        amount: options.amount,
        description: options.description,
        expiry: options.expiry
      });

      // Store invoice details
      this.invoices.set(bolt11, {
        orderId: options.orderId,
        amount: options.amount,
        paid: false
      });

      return bolt11;
    } catch (error) {
      logger.error('Failed to create invoice', { error, options });
      throw new NostrError(
        ErrorCode.INVOICE_CREATION_FAILED,
        'Failed to create invoice',
        { error }
      );
    }
  }

  /**
   * Process a tip payment
   */
  async processTip(options: TipOptions): Promise<string> {
    validatePaymentAmount(options.amount);

    if (!this.nwc) {
      throw new NostrError(
        ErrorCode.NOT_CONNECTED,
        'No wallet connected'
      );
    }

    try {
      const paymentHash = await this.nwc.payInvoice(options.bolt11, {
        amount: options.amount
      });

      this.emit('tip:sent', {
        recipient: options.recipient,
        amount: options.amount,
        message: options.message,
        paymentHash
      });

      return paymentHash;
    } catch (error) {
      logger.error('Failed to process tip', { error, options });
      throw new NostrError(
        ErrorCode.PAYMENT_FAILED,
        'Failed to process tip payment',
        { error }
      );
    }
  }

  /**
   * Verify a payment
   */
  async verifyPayment(invoiceId: string): Promise<boolean> {
    const invoice = this.invoices.get(invoiceId);
    if (!invoice) {
      throw new NostrError(
        ErrorCode.INVOICE_NOT_FOUND,
        'Invoice not found'
      );
    }

    if (invoice.paid) {
      return true;
    }

    // Check payment status through NWC
    if (this.nwc) {
      try {
        const transactions = await this.nwc.listTransactions({ limit: 10 });
        const payment = transactions.find(tx => tx.paymentHash === invoiceId);
        
        if (payment && payment.status === 'complete') {
          invoice.paid = true;
          
          // Update order status
          const order = this.orders.get(invoice.orderId);
          if (order) {
            order.status = 'paid';
            order.updatedAt = Date.now();
            this.emit('order:paid', order);
          }

          return true;
        }
      } catch (error) {
        logger.error('Failed to verify payment', { error, invoiceId });
      }
    }

    return false;
  }

  /**
   * Get order details
   */
  getOrder(orderId: string): Order | undefined {
    return this.orders.get(orderId);
  }

  /**
   * Update order status
   */
  async updateOrderStatus(orderId: string, status: OrderStatus): Promise<void> {
    const order = this.orders.get(orderId);
    if (!order) {
      throw new NostrError(
        ErrorCode.NOT_FOUND,
        'Order not found'
      );
    }

    order.status = status;
    order.updatedAt = Date.now();
    
    this.emit('order:updated', order);
  }

  /**
   * Handle incoming payment notifications
   */
  private async handlePaymentNotification(event: NostrEvent): Promise<void> {
    try {
      const content = JSON.parse(event.content);
      const invoiceId = event.tags.find(tag => tag[0] === 'bolt11')?.[1];
      
      if (invoiceId && this.invoices.has(invoiceId)) {
        const invoice = this.invoices.get(invoiceId)!;
        
        if (content.amount >= invoice.amount) {
          invoice.paid = true;
          
          // Update order status
          const order = this.orders.get(invoice.orderId);
          if (order) {
            order.status = 'paid';
            order.updatedAt = Date.now();
            this.emit('order:paid', order);
          }

          this.emit('payment:received', {
            invoiceId,
            amount: content.amount,
            orderId: invoice.orderId
          });
        }
      }
    } catch (error) {
      logger.error('Error processing payment notification', { error, event });
    }
  }

  /**
   * Clean up resources
   */
  cleanup(): void {
    if (this.nwc) {
      this.nwc.disconnect();
      this.nwc = null;
    }
    
    this.orders.clear();
    this.invoices.clear();
    this.removeAllListeners();
  }
}