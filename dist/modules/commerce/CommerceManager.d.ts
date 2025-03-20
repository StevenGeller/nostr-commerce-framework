/// <reference types="node" />
import { EventEmitter } from 'events';
import { CommerceModule, InvoiceOptions, TipOptions } from '../../types';
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
export declare class CommerceManager extends EventEmitter implements CommerceModule {
    private pubkey;
    private orders;
    private invoices;
    private nwc;
    constructor(pubkey: string);
    /**
     * Connect to a Nostr Wallet
     */
    connectWallet(connectionString: string): Promise<void>;
    /**
     * Create a new order
     */
    createOrder(items: OrderItem[], customerPubkey: string, metadata?: Record<string, any>): Promise<Order>;
    /**
     * Create an invoice for an order
     */
    createInvoice(options: InvoiceOptions): Promise<string>;
    /**
     * Process a tip payment
     */
    processTip(options: TipOptions): Promise<string>;
    /**
     * Verify a payment
     */
    verifyPayment(invoiceId: string): Promise<boolean>;
    /**
     * Get order details
     */
    getOrder(orderId: string): Order | undefined;
    /**
     * Update order status
     */
    updateOrderStatus(orderId: string, status: OrderStatus): Promise<void>;
    /**
     * Handle incoming payment notifications
     */
    private handlePaymentNotification;
    /**
     * Clean up resources
     */
    cleanup(): void;
}
export {};
