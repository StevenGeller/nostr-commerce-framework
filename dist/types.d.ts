/// <reference types="node" />
import { EventEmitter } from 'events';
export interface NostrEvent {
    kind: number;
    created_at: number;
    content: string;
    tags: string[][];
    pubkey: string;
    id: string;
    sig: string;
}
export interface NostrConfig {
    relays: string[];
    publicKey: string;
    privateKey: string;
    maxConnections?: number;
    connectionTimeout?: number;
    rateLimitWindow?: number;
    rateLimitMax?: number;
}
export interface InvoiceOptions {
    orderId: string;
    amount: number;
    description: string;
    expiry?: number;
    metadata?: Record<string, any>;
}
export interface TipOptions {
    recipient: string;
    amount: number;
    bolt11: string;
    message?: string;
}
export interface CommerceModule extends EventEmitter {
    createInvoice(options: InvoiceOptions): Promise<string>;
    processTip(options: TipOptions): Promise<string>;
    verifyPayment(invoiceId: string): Promise<boolean>;
    on(event: 'paymentReceived', listener: (payment: any) => void): this;
    on(event: 'invoiceExpired', listener: (invoiceId: string) => void): this;
    on(event: 'order:created' | 'order:updated' | 'order:paid', listener: (order: any) => void): this;
    on(event: 'wallet:connected' | 'wallet:disconnected', listener: () => void): this;
}
export interface InteractionModule extends EventEmitter {
    sendMessage(content: string, recipient: string): Promise<string>;
    subscribe(callback: (event: NostrEvent) => void): () => void;
}
