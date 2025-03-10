import { NostrEvent, EventEmitter } from '../types';
import { generatePrivateKey, getPublicKey } from 'nostr-tools';

interface NWCConnectionOptions {
  connectionString: string;
  appName: string;
  supportedMethods?: string[];
}

interface NWCInfo {
  name: string;
  pubkey: string;
  supportedMethods: string[];
}

export class NostrWalletConnect extends EventEmitter {
  private connectionString: string;
  private appName: string;
  private relayUrl: string;
  private secret: string;
  private pubkey: string;
  private supportedMethods: string[];
  private connected: boolean = false;

  constructor(options: NWCConnectionOptions) {
    super();
    this.connectionString = options.connectionString;
    this.appName = options.appName;
    this.supportedMethods = options.supportedMethods || [
      'pay_invoice',
      'get_balance',
      'get_info',
      'list_transactions',
      'make_invoice'
    ];

    // Parse connection string
    this.parseConnectionString();
  }

  private parseConnectionString() {
    try {
      const url = new URL(this.connectionString);
      if (!url.protocol.startsWith('nostr+walletconnect')) {
        throw new Error('Invalid NWC protocol');
      }

      // Get pubkey from pathname
      this.pubkey = url.pathname.slice(2); // Remove // from pathname

      // Get relay and secret from query params
      const params = new URLSearchParams(url.search);
      this.relayUrl = params.get('relay');
      this.secret = params.get('secret');

      if (!this.relayUrl || !this.secret) {
        throw new Error('Missing required parameters');
      }
    } catch (error) {
      throw new Error('Invalid connection string format');
    }
  }

  async connect(): Promise<NWCInfo> {
    try {
      // Initialize connection
      await this.initializeConnection();

      // Get wallet info
      const info = await this.getInfo();
      this.connected = true;
      
      return info;
    } catch (error) {
      throw new Error(`Failed to connect: ${error.message}`);
    }
  }

  private async initializeConnection() {
    // Send initialization event to relay
    const event = await this.createEvent('connect', {
      appName: this.appName,
      supportedMethods: this.supportedMethods
    });

    await this.sendEvent(event);
  }

  async getInfo(): Promise<NWCInfo> {
    const event = await this.createEvent('get_info', {});
    const response = await this.sendEvent(event);
    return response as NWCInfo;
  }

  async payInvoice(bolt11: string, options?: { amount?: number }): Promise<string> {
    if (!this.connected) throw new Error('Not connected');

    const event = await this.createEvent('pay_invoice', {
      invoice: bolt11,
      ...options
    });

    const response = await this.sendEvent(event);
    return response.paymentHash;
  }

  async getBalance(): Promise<{ balance: number }> {
    if (!this.connected) throw new Error('Not connected');

    const event = await this.createEvent('get_balance', {});
    return await this.sendEvent(event);
  }

  async makeInvoice(options: {
    amount: number;
    description: string;
    expiry?: number;
  }): Promise<string> {
    if (!this.connected) throw new Error('Not connected');

    const event = await this.createEvent('make_invoice', options);
    const response = await this.sendEvent(event);
    return response.bolt11;
  }

  async listTransactions(options?: {
    limit?: number;
    offset?: number;
  }): Promise<any[]> {
    if (!this.connected) throw new Error('Not connected');

    const event = await this.createEvent('list_transactions', options || {});
    return await this.sendEvent(event);
  }

  private async createEvent(method: string, params: any): Promise<NostrEvent> {
    // Implementation of event creation with encryption using the secret
    // This is a placeholder - actual implementation would use nostr-tools
    return {
      kind: 23194,  // NWC event kind
      created_at: Math.floor(Date.now() / 1000),
      content: JSON.stringify({
        method,
        params
      }),
      tags: [
        ['p', this.pubkey]
      ],
      pubkey: getPublicKey(this.secret),
      id: '',  // To be calculated
      sig: ''  // To be calculated
    };
  }

  private async sendEvent(event: NostrEvent): Promise<any> {
    // Implementation of sending event to relay and waiting for response
    // This is a placeholder - actual implementation would use a relay client
    throw new Error('Not implemented');
  }

  disconnect() {
    this.connected = false;
    // Clean up resources
  }
}