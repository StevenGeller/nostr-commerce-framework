import { EventEmitter } from 'events';
import { NostrEvent } from './types';
import { logger } from './logging';

export class CommerceManager extends EventEmitter {
    private nostr: any;
    private invoices: Map<string, any>;
    private payments: Map<string, any>;

    constructor(nostr: any) {
        super();
        this.nostr = nostr;
        this.invoices = new Map();
        this.payments = new Map();
    }

    async createInvoice(options: any): Promise<any> {
        try {
            const { amount, description, expiry, metadata } = options;

            // Create a unique invoice ID
            const invoiceId = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

            // Create the invoice event
            const event: NostrEvent = {
                kind: 23194, // Standard Nostr invoice kind
                created_at: Math.floor(Date.now() / 1000),
                content: JSON.stringify({
                    amount,
                    description,
                    expiry,
                    ...metadata
                }),
                tags: [
                    ['i', invoiceId],
                    ['amount', amount.toString()],
                    ['currency', 'sats']
                ]
            };

            // Sign and publish the event
            const eventId = await this.nostr.publish(event);

            // Store invoice details
            const invoice = {
                id: invoiceId,
                eventId,
                amount,
                description,
                status: 'pending',
                created_at: new Date().toISOString(),
                expires_at: new Date(Date.now() + (expiry * 1000)).toISOString(),
                metadata
            };

            this.invoices.set(invoiceId, invoice);

            return invoice;
        } catch (error) {
            logger.error('Error creating invoice:', error);
            throw error;
        }
    }

    async getPayment(invoiceId: string): Promise<any> {
        return this.payments.get(invoiceId) || null;
    }

    async verifyPayment(invoiceId: string): Promise<boolean> {
        const payment = await this.getPayment(invoiceId);
        return payment?.status === 'paid';
    }

    // Method to handle incoming payment events
    handlePaymentEvent(event: NostrEvent): void {
        try {
            const content = JSON.parse(event.content);
            const invoiceId = event.tags.find(tag => tag[0] === 'i')?.[1];

            if (!invoiceId) {
                logger.warn('Payment event missing invoice ID:', event);
                return;
            }

            const invoice = this.invoices.get(invoiceId);
            if (!invoice) {
                logger.warn('Payment received for unknown invoice:', invoiceId);
                return;
            }

            const payment = {
                invoiceId,
                eventId: event.id,
                amount: content.amount,
                status: 'paid',
                paid_at: new Date().toISOString(),
                metadata: content.metadata
            };

            this.payments.set(invoiceId, payment);
            this.emit('paymentReceived', payment);

        } catch (error) {
            logger.error('Error handling payment event:', error);
        }
    }

    // Subscribe to payment events
    subscribeToPayments(): void {
        const filter = {
            kinds: [23195], // Standard Nostr payment kind
            '#p': [this.nostr.config.publicKey]
        };

        this.nostr.subscribe([filter], (event: NostrEvent) => {
            this.handlePaymentEvent(event);
        });
    }
}