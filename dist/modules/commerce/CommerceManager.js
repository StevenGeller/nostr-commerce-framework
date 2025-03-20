"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CommerceManager = void 0;
const events_1 = require("events");
const errors_1 = require("../../core/errors");
const logging_1 = require("../../core/logging");
const validation_1 = require("../../core/validation");
const nwc_1 = require("../../nwc");
class CommerceManager extends events_1.EventEmitter {
    constructor(pubkey) {
        super();
        this.pubkey = pubkey;
        this.orders = new Map();
        this.invoices = new Map();
        this.nwc = null;
    }
    /**
     * Connect to a Nostr Wallet
     */
    async connectWallet(connectionString) {
        try {
            this.nwc = new nwc_1.NostrWalletConnect({
                connectionString,
                appName: 'Nostr Commerce',
                supportedMethods: ['pay_invoice', 'make_invoice', 'get_balance']
            });
            await this.nwc.connect();
            this.nwc.on('disconnected', () => {
                this.emit('wallet:disconnected');
            });
            this.emit('wallet:connected');
        }
        catch (error) {
            logging_1.logger.error('Failed to connect wallet', { error });
            throw new errors_1.NostrError(errors_1.ErrorCode.CONNECTION_FAILED, 'Failed to connect to wallet', { error });
        }
    }
    /**
     * Create a new order
     */
    async createOrder(items, customerPubkey, metadata) {
        // Validate items
        if (!items || items.length === 0) {
            throw new errors_1.NostrError(errors_1.ErrorCode.INVALID_PARAMETER, 'Order must contain at least one item');
        }
        // Calculate total
        const total = items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
        // Create order
        const order = {
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
    async createInvoice(options) {
        (0, validation_1.validatePaymentAmount)(options.amount);
        if (!this.nwc) {
            throw new errors_1.NostrError(errors_1.ErrorCode.NOT_CONNECTED, 'No wallet connected');
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
        }
        catch (error) {
            logging_1.logger.error('Failed to create invoice', { error, options });
            throw new errors_1.NostrError(errors_1.ErrorCode.INVOICE_CREATION_FAILED, 'Failed to create invoice', { error });
        }
    }
    /**
     * Process a tip payment
     */
    async processTip(options) {
        (0, validation_1.validatePaymentAmount)(options.amount);
        if (!this.nwc) {
            throw new errors_1.NostrError(errors_1.ErrorCode.NOT_CONNECTED, 'No wallet connected');
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
        }
        catch (error) {
            logging_1.logger.error('Failed to process tip', { error, options });
            throw new errors_1.NostrError(errors_1.ErrorCode.PAYMENT_FAILED, 'Failed to process tip payment', { error });
        }
    }
    /**
     * Verify a payment
     */
    async verifyPayment(invoiceId) {
        const invoice = this.invoices.get(invoiceId);
        if (!invoice) {
            throw new errors_1.NostrError(errors_1.ErrorCode.INVOICE_NOT_FOUND, 'Invoice not found');
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
            }
            catch (error) {
                logging_1.logger.error('Failed to verify payment', { error, invoiceId });
            }
        }
        return false;
    }
    /**
     * Get order details
     */
    getOrder(orderId) {
        return this.orders.get(orderId);
    }
    /**
     * Update order status
     */
    async updateOrderStatus(orderId, status) {
        const order = this.orders.get(orderId);
        if (!order) {
            throw new errors_1.NostrError(errors_1.ErrorCode.NOT_FOUND, 'Order not found');
        }
        order.status = status;
        order.updatedAt = Date.now();
        this.emit('order:updated', order);
    }
    /**
     * Handle incoming payment notifications
     */
    async handlePaymentNotification(event) {
        try {
            const content = JSON.parse(event.content);
            const invoiceId = event.tags.find(tag => tag[0] === 'bolt11')?.[1];
            if (invoiceId && this.invoices.has(invoiceId)) {
                const invoice = this.invoices.get(invoiceId);
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
        }
        catch (error) {
            logging_1.logger.error('Error processing payment notification', { error, event });
        }
    }
    /**
     * Clean up resources
     */
    cleanup() {
        if (this.nwc) {
            this.nwc.disconnect();
            this.nwc = null;
        }
        this.orders.clear();
        this.invoices.clear();
        this.removeAllListeners();
    }
}
exports.CommerceManager = CommerceManager;
