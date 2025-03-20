"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.NostrWalletConnect = void 0;
const types_1 = require("../types");
const nostr_tools_1 = require("nostr-tools");
const ws_1 = __importDefault(require("ws"));
class NostrWalletConnect extends types_1.EventEmitter {
    constructor(options) {
        super();
        this.relayUrl = '';
        this.secret = '';
        this.pubkey = '';
        this.connected = false;
        this.ws = null;
        this.pendingRequests = new Map();
        this.connectionString = options.connectionString;
        this.appName = options.appName;
        this.timeout = options.timeout || 30000; // Default 30 second timeout
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
    parseConnectionString() {
        try {
            // Remove protocol prefix for parsing
            const cleanUrl = this.connectionString.replace('nostr+walletconnect:', '');
            // Split into pubkey and params
            const [pubkey, params] = cleanUrl.split('?');
            if (!pubkey) {
                throw new Error('Invalid NWC protocol');
            }
            this.pubkey = pubkey;
            // Parse query parameters
            const searchParams = new URLSearchParams('?' + params);
            const relay = searchParams.get('relay');
            const secret = searchParams.get('secret');
            if (!relay || !secret) {
                throw new Error('Invalid NWC protocol');
            }
            this.relayUrl = decodeURIComponent(relay);
            this.secret = secret;
        }
        catch (error) {
            if (error.message === 'Invalid NWC protocol') {
                throw error;
            }
            throw new Error('Invalid NWC protocol');
        }
    }
    getConnectionDetails() {
        return {
            pubkey: this.pubkey,
            relayUrl: this.relayUrl,
            secret: this.secret
        };
    }
    async connect() {
        return new Promise((resolve, reject) => {
            try {
                this.ws = new ws_1.default(this.relayUrl);
                this.ws.on('open', async () => {
                    try {
                        // Get wallet info
                        const info = await this.getInfo();
                        this.connected = true;
                        resolve(info);
                    }
                    catch (error) {
                        reject(error);
                    }
                });
                this.ws.on('message', (data) => {
                    try {
                        const event = JSON.parse(data);
                        this.handleIncomingEvent(event);
                    }
                    catch (error) {
                        console.error('Error handling message:', error);
                    }
                });
                this.ws.on('error', (error) => {
                    reject(error);
                });
                this.ws.on('close', () => {
                    this.connected = false;
                    this.emit('disconnected');
                });
            }
            catch (error) {
                reject(error);
            }
        });
    }
    async getInfo() {
        const response = await this.sendRequest('get_info', {});
        return {
            name: response.name,
            pubkey: this.pubkey,
            supportedMethods: response.methods || this.supportedMethods
        };
    }
    async payInvoice(bolt11, options) {
        if (!this.connected)
            throw new Error('Not connected');
        const response = await this.sendRequest('pay_invoice', {
            invoice: bolt11,
            ...options
        });
        return response.paymentHash;
    }
    async getBalance() {
        if (!this.connected)
            throw new Error('Not connected');
        return await this.sendRequest('get_balance', {});
    }
    async makeInvoice(options) {
        if (!this.connected)
            throw new Error('Not connected');
        const response = await this.sendRequest('make_invoice', options);
        return response.bolt11;
    }
    async listTransactions(options) {
        if (!this.connected)
            throw new Error('Not connected');
        return await this.sendRequest('list_transactions', options || {});
    }
    async createEvent(method, params) {
        const content = {
            method,
            params
        };
        const event = {
            kind: 23194, // NWC event kind
            created_at: Math.floor(Date.now() / 1000),
            content: JSON.stringify(content), // For testing, we'll skip encryption
            tags: [
                ['p', this.pubkey]
            ],
            pubkey: (0, nostr_tools_1.getPublicKey)(this.secret),
            id: '', // To be calculated
            sig: '' // To be calculated
        };
        return event;
    }
    async sendRequest(method, params) {
        if (!this.ws || this.ws.readyState !== ws_1.default.OPEN) {
            throw new Error('WebSocket not connected');
        }
        const event = await this.createEvent(method, params);
        return new Promise((resolve, reject) => {
            // Set timeout
            const timeoutId = setTimeout(() => {
                this.pendingRequests.delete(event.id);
                reject(new Error('Request timeout'));
            }, this.timeout);
            // Store the pending request
            this.pendingRequests.set(event.id, {
                resolve,
                reject,
                timeout: timeoutId
            });
            // Send the event
            if (this.ws) {
                this.ws.send(JSON.stringify(['EVENT', event]));
            }
            else {
                clearTimeout(timeoutId);
                reject(new Error('WebSocket not initialized'));
            }
        });
    }
    async handleIncomingEvent(event) {
        try {
            const content = JSON.parse(event.content);
            // Find and resolve the pending request
            const pending = this.pendingRequests.get(event.id);
            if (pending) {
                clearTimeout(pending.timeout);
                this.pendingRequests.delete(event.id);
                if (content.error) {
                    pending.reject(new Error(content.error));
                }
                else {
                    pending.resolve(content.result);
                }
            }
            // Emit event for subscribers
            this.emit('event', content);
        }
        catch (error) {
            console.error('Error handling incoming event:', error);
        }
    }
    disconnect() {
        if (this.ws) {
            this.ws.close();
        }
        this.connected = false;
        this.pendingRequests.clear();
    }
}
exports.NostrWalletConnect = NostrWalletConnect;
