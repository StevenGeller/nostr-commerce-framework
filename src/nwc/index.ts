import { NostrEvent, getPublicKey, getSignature, generatePrivateKey, nip04 } from 'nostr-tools';
import { EventEmitter } from 'events';
import { createHash } from 'crypto';

export interface NWCConfig {
  relayUrl: string;
  secretKey?: string;
  publicKey?: string;
  walletPubkey?: string;
  connectionTimeout?: number;
  paymentTimeout?: number;
  autoReconnect?: boolean;
  maxRetries?: number;
}

export interface PaymentRequest {
  amount: number;
  invoice: string;
  comment?: string;
  externalId?: string;
  timeout?: number;
}

export interface PaymentResponse {
  preimage: string;
  paymentHash: string;
  amount: number;
  timestamp: number;
  fee?: number;
  externalId?: string;
}

export interface WalletInfo {
  balance: number;
  network: string;
  features: string[];
  version?: string;
  alias?: string;
  color?: string;
}

export interface WalletCapabilities {
  payInvoice: boolean;
  createInvoice: boolean;
  signMessage: boolean;
  nip04: boolean;
  nip47: boolean;
}

export interface ConnectionInfo {
  status: 'connected' | 'disconnected' | 'error';
  pubkey: string;
  capabilities: WalletCapabilities;
  metadata?: Record<string, any>;
}

export class NostrWalletConnect extends EventEmitter {
  private relayUrl: string;
  private secretKey: string;
  private publicKey: string;
  private walletPubkey: string;
  private connected: boolean = false;
  private subscriptions: Map<string, () => void> = new Map();
  private reconnectAttempts: number = 0;
  private connectionTimeout: number;
  private paymentTimeout: number;
  private autoReconnect: boolean;
  private maxRetries: number;
  private capabilities?: WalletCapabilities;
  private lastKnownBalance?: number;
  private pendingPayments: Map<string, (response: PaymentResponse) => void> = new Map();

  constructor(config: NWCConfig) {
    super();
    this.relayUrl = config.relayUrl;
    this.connectionTimeout = config.connectionTimeout || 30000;
    this.paymentTimeout = config.paymentTimeout || 60000;
    this.autoReconnect = config.autoReconnect ?? true;
    this.maxRetries = config.maxRetries || 3;
    
    if (config.secretKey) {
      this.secretKey = config.secretKey;
      this.publicKey = getPublicKey(config.secretKey);
    } else {
      this.secretKey = generatePrivateKey();
      this.publicKey = getPublicKey(this.secretKey);
    }

    this.walletPubkey = config.walletPubkey || '';
    
    // Setup auto-reconnect
    if (this.autoReconnect) {
      this.on('disconnected', this.handleDisconnect.bind(this));
    }
  }

  /**
   * Connect to a NWC-compatible wallet
   */
  async connect(walletPubkey?: string): Promise<ConnectionInfo> {
    if (walletPubkey) {
      this.walletPubkey = walletPubkey;
    }

    if (!this.walletPubkey) {
      throw new Error('Wallet public key is required');
    }

    // Reset reconnect attempts
    this.reconnectAttempts = 0;

    // Create connection request event
    const connectionEvent = this.createEvent({
      kind: 13194, // NWC Connection Request
      content: JSON.stringify({
        version: '1',
        required_capabilities: ['payInvoice', 'nip47']
      }),
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
      }, this.connectionTimeout);

      this.once('connected', (info: ConnectionInfo) => {
        clearTimeout(timeout);
        this.connected = true;
        this.capabilities = info.capabilities;
        resolve(info);
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

    if (!this.capabilities?.payInvoice) {
      throw new Error('Wallet does not support paying invoices');
    }

    const paymentId = request.externalId || createHash('sha256')
      .update(request.invoice + Date.now().toString())
      .digest('hex');

    // Create payment request event
    const paymentEvent = this.createEvent({
      kind: 23194, // NWC Payment Request
      content: JSON.stringify({
        method: 'pay_invoice',
        params: {
          invoice: request.invoice,
          amount: request.amount,
          comment: request.comment,
          payment_id: paymentId
        }
      }),
      tags: [
        ['p', this.walletPubkey],
        ['amount', request.amount.toString()],
        ['payment_id', paymentId],
        ['type', 'ln']
      ]
    });

    // Publish payment request
    await this.publishEvent(paymentEvent);

    // Wait for payment response
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        this.pendingPayments.delete(paymentId);
        reject(new Error('Payment timeout'));
      }, request.timeout || this.paymentTimeout);

      // Store the resolve function
      this.pendingPayments.set(paymentId, (response: PaymentResponse) => {
        clearTimeout(timeout);
        resolve(response);
      });
    });
  }

  /**
   * Create a Lightning invoice using the connected wallet
   */
  async createInvoice(amount: number, description: string): Promise<string> {
    if (!this.connected) {
      throw new Error('Not connected to wallet');
    }

    if (!this.capabilities?.createInvoice) {
      throw new Error('Wallet does not support creating invoices');
    }

    const event = this.createEvent({
      kind: 23194,
      content: JSON.stringify({
        method: 'create_invoice',
        params: {
          amount,
          description
        }
      }),
      tags: [
        ['p', this.walletPubkey],
        ['type', 'invoice']
      ]
    });

    await this.publishEvent(event);

    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error('Invoice creation timeout'));
      }, this.connectionTimeout);

      this.once('invoice', (invoice: string) => {
        clearTimeout(timeout);
        resolve(invoice);
      });
    });
  }

  /**
   * Get wallet information
   */
  async getInfo(): Promise<WalletInfo> {
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
      }, this.connectionTimeout);

      this.once('info', (info: WalletInfo) => {
        clearTimeout(timeout);
        this.lastKnownBalance = info.balance;
        resolve(info);
      });
    });
  }

  /**
   * Sign a message using the wallet
   */
  async signMessage(message: string): Promise<string> {
    if (!this.connected) {
      throw new Error('Not connected to wallet');
    }

    if (!this.capabilities?.signMessage) {
      throw new Error('Wallet does not support message signing');
    }

    const event = this.createEvent({
      kind: 23194,
      content: JSON.stringify({
        method: 'sign_message',
        params: {
          message
        }
      }),
      tags: [
        ['p', this.walletPubkey],
        ['type', 'sign']
      ]
    });

    await this.publishEvent(event);

    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error('Signing timeout'));
      }, this.connectionTimeout);

      this.once('signature', (signature: string) => {
        clearTimeout(timeout);
        resolve(signature);
      });
    });
  }

  /**
   * Encrypt a message using NIP-04
   */
  async encryptMessage(message: string, recipientPubkey: string): Promise<string> {
    if (!this.connected) {
      throw new Error('Not connected to wallet');
    }

    if (!this.capabilities?.nip04) {
      throw new Error('Wallet does not support NIP-04 encryption');
    }

    return nip04.encrypt(this.secretKey, recipientPubkey, message);
  }

  /**
   * Decrypt a message using NIP-04
   */
  async decryptMessage(message: string, senderPubkey: string): Promise<string> {
    if (!this.connected) {
      throw new Error('Not connected to wallet');
    }

    if (!this.capabilities?.nip04) {
      throw new Error('Wallet does not support NIP-04 decryption');
    }

    return nip04.decrypt(this.secretKey, senderPubkey, message);
  }

  /**
   * Check if specific capability is supported
   */
  hasCapability(capability: keyof WalletCapabilities): boolean {
    return this.capabilities?.[capability] || false;
  }

  /**
   * Get last known wallet balance
   */
  getLastKnownBalance(): number | undefined {
    return this.lastKnownBalance;
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

    // Subscribe to other responses (info, invoice, etc.)
    this.subscribeToEvents({
      kinds: [23196], // NWC General Response
      authors: [this.walletPubkey],
      '#p': [this.publicKey]
    }, (event) => {
      this.handleGeneralResponse(event);
    });
  }

  /**
   * Handle connection response events
   */
  private handleConnectionResponse(event: NostrEvent): void {
    try {
      const content = JSON.parse(event.content);
      if (content.status === 'connected') {
        const info: ConnectionInfo = {
          status: 'connected',
          pubkey: this.walletPubkey,
          capabilities: content.capabilities,
          metadata: content.metadata
        };
        this.capabilities = content.capabilities;
        this.emit('connected', info);
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
      const paymentId = event.tags.find(t => t[0] === 'payment_id')?.[1];

      if (!paymentId) {
        this.emit('error', new Error('Missing payment ID in response'));
        return;
      }

      const resolvePayment = this.pendingPayments.get(paymentId);
      if (!resolvePayment) {
        return; // No pending payment with this ID
      }

      if (content.status === 'success') {
        resolvePayment({
          preimage: content.preimage,
          paymentHash: content.payment_hash,
          amount: parseInt(content.amount),
          timestamp: event.created_at,
          fee: content.fee,
          externalId: paymentId
        });
        this.pendingPayments.delete(paymentId);
      } else {
        this.emit('error', new Error(content.reason || 'Payment failed'));
      }
    } catch (error) {
      this.emit('error', error);
    }
  }

  /**
   * Handle general response events (info, invoice, etc.)
   */
  private handleGeneralResponse(event: NostrEvent): void {
    try {
      const content = JSON.parse(event.content);
      const type = event.tags.find(t => t[0] === 'type')?.[1];

      switch (type) {
        case 'info':
          this.emit('info', content);
          break;
        case 'invoice':
          this.emit('invoice', content.invoice);
          break;
        case 'sign':
          this.emit('signature', content.signature);
          break;
        default:
          this.emit('response', { type, content });
      }
    } catch (error) {
      this.emit('error', error);
    }
  }

  /**
   * Handle disconnect events and auto-reconnect
   */
  private async handleDisconnect(): Promise<void> {
    if (!this.autoReconnect || this.reconnectAttempts >= this.maxRetries) {
      return;
    }

    this.reconnectAttempts++;
    const delay = Math.min(1000 * Math.pow(2, this.reconnectAttempts - 1), 30000);

    await new Promise(resolve => setTimeout(resolve, delay));

    try {
      await this.connect();
      this.reconnectAttempts = 0;
    } catch (error) {
      this.emit('error', error);
      this.handleDisconnect();
    }
  }

  /**
   * Calculate event ID (SHA-256)
   */
  private calculateEventId(event: NostrEvent): string {
    const eventData = JSON.stringify([
      0,
      event.pubkey,
      event.created_at,
      event.kind,
      event.tags,
      event.content
    ]);
    return createHash('sha256').update(eventData).digest('hex');
  }

  /**
   * Publish event to relay
   */
  private async publishEvent(event: NostrEvent): Promise<void> {
    // TODO: Implement relay publication
    // This would involve connecting to the relay via WebSocket
    // and publishing the event according to the Nostr protocol
  }

  /**
   * Subscribe to events from relay
   */
  private subscribeToEvents(filter: any, callback: (event: NostrEvent) => void): () => void {
    // TODO: Implement relay subscription
    // This would involve connecting to the relay via WebSocket
    // and subscribing to events according to the Nostr protocol
    return () => {};
  }

  /**
   * Disconnect from wallet
   */
  async disconnect(): Promise<void> {
    this.connected = false;
    this.capabilities = undefined;
    this.lastKnownBalance = undefined;
    
    // Clean up subscriptions
    this.subscriptions.forEach(unsubscribe => unsubscribe());
    this.subscriptions.clear();
    
    // Clear pending payments
    this.pendingPayments.clear();
    
    this.emit('disconnected');
  }

  /**
   * Check if connected to wallet
   */
  isConnected(): boolean {
    return this.connected;
  }

  /**
   * Get wallet capabilities
   */
  getCapabilities(): WalletCapabilities | undefined {
    return this.capabilities;
  }
}