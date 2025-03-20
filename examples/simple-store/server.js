const express = require('express');
const { NostrCommerce, CommerceManager } = require('../..');
const crypto = require('crypto');

// Generate test keys if not provided
const privateKey = process.env.STORE_PRIVATE_KEY || crypto.randomBytes(32).toString('hex');
const pubkey = process.env.STORE_PUBKEY;

// Initialize the commerce framework
const commerce = new CommerceManager(pubkey);

// Sample products
const products = [
  {
    id: 'tshirt-1',
    name: 'Nostr T-Shirt',
    description: 'A comfortable cotton t-shirt with Nostr logo',
    price: 25.00,
    image: 'https://via.placeholder.com/400',
    metadata: {
      sizes: ['S', 'M', 'L', 'XL'],
      color: 'Black'
    }
  },
  {
    id: 'sticker-pack',
    name: 'Nostr Sticker Pack',
    description: 'Set of 5 high-quality Nostr-themed stickers',
    price: 10.00,
    image: 'https://via.placeholder.com/400',
    metadata: {
      quantity: '5 stickers per pack'
    }
  }
];

// Create Express app
const app = express();
app.use(express.json());
app.use(express.static('public'));

// Store endpoints
app.get('/api/products', (req, res) => {
  res.json(products);
});

// Create new order
app.post('/api/orders', async (req, res) => {
  try {
    const { items, customerPubkey } = req.body;
    
    if (!items || !customerPubkey) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // Validate items and calculate total
    const orderItems = items.map(item => {
      const product = products.find(p => p.id === item.id);
      if (!product) {
        throw new Error(`Product not found: ${item.id}`);
      }
      return {
        id: item.id,
        quantity: item.quantity,
        price: product.price
      };
    });

    const order = await commerce.createOrder(orderItems, customerPubkey);
    
    // Create invoice
    const invoice = await commerce.createInvoice({
      orderId: order.id,
      amount: order.total,
      description: `Order ${order.id}`,
      expiry: 3600 // 1 hour
    });

    res.json({
      success: true,
      order,
      invoice
    });
  } catch (error) {
    console.error('Error creating order:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get order status
app.get('/api/orders/:orderId', async (req, res) => {
  try {
    const order = commerce.getOrder(req.params.orderId);
    if (!order) {
      return res.status(404).json({ error: 'Order not found' });
    }
    res.json(order);
  } catch (error) {
    console.error('Error fetching order:', error);
    res.status(500).json({ error: error.message });
  }
});

// Connect to wallet
app.post('/api/wallet/connect', async (req, res) => {
  try {
    const { connectionString } = req.body;
    if (!connectionString) {
      return res.status(400).json({ error: 'Missing connection string' });
    }

    await commerce.connectWallet(connectionString);
    res.json({ success: true });
  } catch (error) {
    console.error('Error connecting wallet:', error);
    res.status(500).json({ error: error.message });
  }
});

// Start the server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Store pubkey: ${pubkey}`);
  console.log(`Server running on port ${PORT}`);
});