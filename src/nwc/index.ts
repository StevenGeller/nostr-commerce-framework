import { NostrEvent, getPublicKey, getSignature } from 'nostr-tools';
import { EventEmitter } from 'events';

interface NWCConfig {
  relayUrl: string;
  secretKey?: string;
  publicKey?: string;
  walletPubkey?: string;
}

interface PaymentRequest {
  amount: number;
  invoice: string;
  comment?: string;
}

interface PaymentResponse {
  preimage: string;
  paymentHash: string;
  amount: number;
  timestamp: number;
}

export class NostrWalletConnect extends EventEmitter {
  private relayUrl: string;
  private secretKey: string;
  private publicKey: string;
  private walletPubkey: string;
  private connected: boolean = false;
  private subscriptions: Map<string, () => void> = new Map();

  constructor(config: NWCConfig) {
    super();
    this.relayUrl = config.relayUrl;
    
    if (config.secretKey) {
      this.secretKey = config.secretKey;
      this.publicKey = getPublicKey(config.secretKey);
    } else {
      // Generate new keypair if not provided
      const privateKey = crypto.getRandomValues(new Uint8Array(32));
      this.secretKey = Buffer.from(privateKey).toString('hex');
      this.publicKey = getPublicKey(this.secretKey);
    }

    this.walletPubkey = config.walletPubkey || '';
  }

  /**
   * Connect to a NWC-compatible wallet
   */
  async connect(walletPubkey?: string): Promise<void> {
    if (walletPubkey) {
      this.walletPubkey = walletPubkey;
    }

    if (!this.walletPubkey) {
      throw new Error('Wallet public key is required');
    }

    // Create connection request event
    const connectionEvent = this.createEvent({
      kind: 13194, // NWC Connection Request
      content: '',
      tags: [
        ['p', this.walletPubkey],
        ['relay', this.relayUrl]
      ]
    });

    // Subscribe to responses
    this.subscribeToResponses();

    // Publish connection request
    await this.publishEvent(connectionEvent);

    // Wait for connection confirmation
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error('Connection timeout'));
      }, 30000);

      this.once('connected', () => {
        clearTimeout(timeout);
        this.connected = true;
        resolve();
      });
    });
  }

  /**
   * Pay a Lightning invoice using the connected wallet
   */
  async payInvoice(request: PaymentRequest): Promise<PaymentResponse> {
    if (!this.connected) {
      throw new Error('Not connected to wallet');
    }

    // Create payment request event
    const paymentEvent = this.createEvent({
      kind: 23194, // NWC Payment Request
      content: JSON.stringify({
        method: 'pay_invoice',
        params: {
          invoice: request.invoice,
          amount: request.amount,
          comment: request.comment
        }
      }),
      tags: [
        ['p', this.walletPubkey],
        ['amount', request.amount.toString()],
        ['type', 'ln']
      ]
    });

    // Publish payment request
    await this.publishEvent(paymentEvent);

    // Wait for payment response
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error('Payment timeout'));
      }, 60000);

      this.once('payment', (response: PaymentResponse) => {
        clearTimeout(timeout);
        resolve(response);
      });
    });
  }

  /**
   * Get wallet information
   */
  async getInfo(): Promise<any> {
    if (!this.connected) {
      throw new Error('Not connected to wallet');
    }

    const infoEvent = this.createEvent({
      kind: 23194,
      content: JSON.stringify({
        method: 'get_info'
      }),
      tags: [
        ['p', this.walletPubkey],
        ['type', 'info']
      ]
    });

    await this.publishEvent(infoEvent);

    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error('Info request timeout'));
      }, 30000);

      this.once('info', (info) => {
        clearTimeout(timeout);
        resolve(info);
      });
    });
  }

  /**
   * Create a signed Nostr event
   */
  private createEvent(params: Partial<NostrEvent>): NostrEvent {
    const event: NostrEvent = {
      kind: params.kind || 1,
      created_at: Math.floor(Date.now() / 1000),
      tags: params.tags || [],
      content: params.content || '',
      pubkey: this.publicKey,
      id: '',
      sig: ''
    };

    // Calculate event ID and sign
    event.id = this.calculateEventId(event);
    event.sig = getSignature(event, this.secretKey);

    return event;
  }

  /**
   * Subscribe to wallet responses
   */
  private subscribeToResponses(): void {
    // Subscribe to connection responses
    this.subscribeToEvents({
      kinds: [13195], // NWC Connection Response
      authors: [this.walletPubkey],
      '#p': [this.publicKey]
    }, (event) => {
      this.handleConnectionResponse(event);
    });

    // Subscribe to payment responses
    this.subscribeToEvents({
      kinds: [23195], // NWC Payment Response
      authors: [this.walletPubkey],
      '#p': [this.publicKey]
    }, (event) => {
      this.handlePaymentResponse(event);
    });
  }

  /**
   * Handle connection response events
   */
  private handleConnectionResponse(event: NostrEvent): void {
    try {
      const content = JSON.parse(event.content);
      if (content.status === 'connected') {
        this.emit('connected', content);
      } else {
        this.emit('error', new Error('Connection rejected'));
      }
    } catch (error) {
      this.emit('error', error);
    }
  }

  /**
   * Handle payment response events
   */
  private handlePaymentResponse(event: NostrEvent): void {
    try {
      const content = JSON.parse(event.content);
      if (content.status === 'success') {
        this.emit('payment', {
          preimage: content.preimage,
          paymentHash: content.payment_hash,
          amount: parseInt(content.amount),
          timestamp: event.created_at
        });
      } else {
        this.emit('error', new Error(content.reason || 'Payment failed'));
      }
    } catch (error) {
      this.emit('error', error);
    }
  }

  /**
   * Calculate event ID (SHA-256)
   */
  private calculateEventId(event: NostrEvent): string {
    // Implementation of event ID calculation
    // This should match the Nostr event ID calculation specification
    return '';  // TODO: Implement proper event ID calculation
  }

  /**
   * Publish event to relay
   */
  private async publishEvent(event: NostrEvent): Promise<void> {
    // TODO: Implement relay publication
  }

  /**
   * Subscribe to events from relay
   */
  private subscribeToEvents(filter: any, callback: (event: NostrEvent) => void): () => void {
    // TODO: Implement relay subscription
    return () => {};
  }

  /**
   * Disconnect from wallet
   */
  async disconnect(): Promise<void> {
    this.connected = false;
    // Clean up subscriptions
    this.subscriptions.forEach(unsubscribe => unsubscribe());
    this.subscriptions.clear();
    this.emit('disconnected');
  }
}