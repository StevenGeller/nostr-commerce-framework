import { EventEmitter } from '../types';
interface NWCConnectionOptions {
    connectionString: string;
    appName: string;
    supportedMethods?: string[];
    timeout?: number;
}
interface NWCInfo {
    name: string;
    pubkey: string;
    supportedMethods: string[];
}
interface ConnectionDetails {
    pubkey: string;
    relayUrl: string;
    secret: string;
}
export declare class NostrWalletConnect extends EventEmitter {
    private connectionString;
    private appName;
    private relayUrl;
    private secret;
    private pubkey;
    private supportedMethods;
    private connected;
    private ws;
    private timeout;
    private pendingRequests;
    constructor(options: NWCConnectionOptions);
    private parseConnectionString;
    getConnectionDetails(): ConnectionDetails;
    connect(): Promise<NWCInfo>;
    getInfo(): Promise<NWCInfo>;
    payInvoice(bolt11: string, options?: {
        amount?: number;
    }): Promise<string>;
    getBalance(): Promise<{
        balance: number;
    }>;
    makeInvoice(options: {
        amount: number;
        description: string;
        expiry?: number;
    }): Promise<string>;
    listTransactions(options?: {
        limit?: number;
        offset?: number;
    }): Promise<any[]>;
    private createEvent;
    private sendRequest;
    private handleIncomingEvent;
    disconnect(): void;
}
export {};
