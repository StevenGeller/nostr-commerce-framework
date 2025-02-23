import { EventEmitter } from 'events';
export interface NostrConfig {
    relays: string[];
    publicKey: string;
    privateKey: string;
    maxConnections?: number;
    connectionTimeout?: number;
    rateLimitWindow?: number;
    rateLimitMax?: number;
}
export interface NostrEvent {
    id: string;
    pubkey: string;
    created_at: number;
    kind: number;
    tags: string[][];
    content: string;
    sig: string;
}
export interface Plugin {
    onRegister?: (framework: any) => void;
    onInitialize?: () => void | Promise<void>;
    onStop?: () => void | Promise<void>;
}
export interface InteractionModule extends EventEmitter {
    sendMessage: (content: string, recipient: string) => Promise<string>;
    subscribe: (callback: (event: NostrEvent) => void) => () => void;
}
export interface InvoiceOptions {
    amount: number;
    description: string;
    expiry?: number;
    metadata?: Record<string, any>;
}
export interface TipOptions {
    recipient: string;
    amount: number;
    message?: string;
}
export interface CommerceModule extends EventEmitter {
    createInvoice: (options: InvoiceOptions) => Promise<string>;
    processTip: (options: TipOptions) => Promise<string>;
    verifyPayment: (invoiceId: string) => Promise<boolean>;
    on(event: 'paymentReceived', listener: (payment: any) => void): this;
    on(event: 'invoiceExpired', listener: (invoiceId: string) => void): this;
}
