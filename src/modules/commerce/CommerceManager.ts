import { CommerceModule, NostrEvent } from '../../core/types';
import { NostrCommerce } from '../../core/NostrCommerce';

export class CommerceManager implements CommerceModule {
  private framework: NostrCommerce;
  private invoices: Map<string, { amount: number; paid: boolean }>;

  constructor(framework: NostrCommerce) {
    this.framework = framework;
    this.invoices = new Map();
    this.setupPaymentListener();
  }

  /**
   * Create a new invoice for payment
   */
  async createInvoice(amount: number, description: string): Promise<string> {
    const event: Partial<NostrEvent> = {
      kind: 9734, // Lightning Invoice
      content: JSON.stringify({
        amount,
        description,
        timestamp: Math.floor(Date.now() / 1000),
      }),
      tags: [['amount', amount.toString()]],
    };

    const invoiceId = await this.framework.publishEvent(event);
    this.invoices.set(invoiceId, { amount, paid: false });
    return invoiceId;
  }

  /**
   * Process a tip to a recipient
   */
  async processTip(recipient: string, amount: number): Promise<string> {
    const event: Partial<NostrEvent> = {
      kind: 9735, // Zap
      content: JSON.stringify({
        amount,
        recipient,
        timestamp: Math.floor(Date.now() / 1000),
      }),
      tags: [
        ['p', recipient],
        ['amount', amount.toString()],
      ],
    };

    return await this.framework.publishEvent(event);
  }

  /**
   * Verify if a payment has been received
   */
  async verifyPayment(invoiceId: string): Promise<boolean> {
    const invoice = this.invoices.get(invoiceId);
    if (!invoice) {
      throw new Error('Invoice not found');
    }
    return invoice.paid;
  }

  /**
   * Set up listener for incoming payments
   */
  private setupPaymentListener(): void {
    const filters = [
      {
        kinds: [9735], // Zap receipts
      },
    ];

    this.framework.subscribe(filters, (event: NostrEvent) => {
      try {
        const paymentData = JSON.parse(event.content);
        const invoiceId = event.tags.find(tag => tag[0] === 'e')?.[1];
        
        if (invoiceId && this.invoices.has(invoiceId)) {
          const invoice = this.invoices.get(invoiceId)!;
          if (paymentData.amount >= invoice.amount) {
            invoice.paid = true;
            this.framework.emit('payment:received', { invoiceId, amount: paymentData.amount });
          }
        }
      } catch (error) {
        console.error('Error processing payment event:', error);
      }
    });
  }

  /**
   * Clean up resources
   */
  cleanup(): void {
    this.invoices.clear();
  }
}