const { EventEmitter } = require('events');
const { generatePrivateKey, getPublicKey } = require('nostr-tools');

class NostrCommerce extends EventEmitter {
  constructor(config = {}) {
    super();
    this.privateKey = config.privateKey || generatePrivateKey();
    this.pubkey = config.pubkey || getPublicKey(this.privateKey);
  }
}

class CommerceManager extends EventEmitter {
  constructor(pubkey) {
    super();
    this.pubkey = pubkey;
    this.orders = new Map();
    this.invoices = new Map();
  }

  async createOrder(items, customerPubkey, metadata = {}) {
    const order = {
      id: Math.random().toString(36).substring(7),
      items,
      total: items.reduce((sum, item) => sum + (item.price * item.quantity), 0),
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

  async createInvoice(options) {
    const { orderId, amount, description } = options;
    
    // For testing, create a dummy invoice
    const invoice = `lnbc${amount}...`;
    
    this.invoices.set(invoice, {
      orderId,
      amount,
      paid: false
    });

    return invoice;
  }

  getOrder(orderId) {
    return this.orders.get(orderId);
  }

  // Simulate payment received
  simulatePayment(orderId) {
    const order = this.orders.get(orderId);
    if (order) {
      order.status = 'paid';
      order.updatedAt = Date.now();
      this.emit('order:paid', order);
    }
  }
}

module.exports = {
  NostrCommerce,
  CommerceManager
};