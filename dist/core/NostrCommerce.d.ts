import { NostrEvent, NostrConfig } from './types';
export declare class NostrCommerce {
    private pools;
    private config;
    constructor(config: NostrConfig);
    private validateConfig;
    start(): Promise<void>;
    stop(): Promise<void>;
    private connectToRelays;
    publish(event: NostrEvent): Promise<string>;
    subscribe(filters: any[], callback: (event: NostrEvent) => void): () => void;
}
