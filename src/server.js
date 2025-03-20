const express = require('express');
const { NostrCommerce } = require('../../src/core/NostrCommerce');
const { CommerceManager } = require('../../src/core/CommerceManager');
const crypto = require('crypto');

// Generate or use provided keys
const privateKey = process.env.STORE_PRIVATE_KEY || crypto.randomBytes(32).toString('hex');
const publicKey = process.env.STORE_PUBKEY || NostrCommerce.getPublicKey(privateKey);

console.log('Initializing with keys:', {
    privateKey,
    publicKey
});

// Initialize NostrCommerce
const nostrCommerce = new NostrCommerce({
    relays: ['wss://relay.primal.net'],
    privateKey: privateKey,
    publicKey: publicKey
});

// Initialize CommerceManager
const commerce = new CommerceManager(nostrCommerce);

// Store configuration
const STORE_CONFIG = {
    name: "Your Store Name",
    description: "Your store description",
    currency: "sats",
    owner: publicKey
};

// Create Express app
const app = express();
app.use(express.json());

// Store endpoints
app.get('/', (req, res) => {
    res.json({
        ...STORE_CONFIG,
        status: 'active'
    });
});

// Create invoice endpoint
app.post('/invoice', async (req, res) => {
    try {
        const { amount, description, buyerPubkey } = req.body;

        if (!amount || !buyerPubkey) {
            return res.status(400).json({ 
                error: 'Missing required fields. Need amount and buyerPubkey.' 
            });
        }

        console.log('Creating invoice with:', {
            amount,
            description,
            buyerPubkey
        });

        const invoiceOptions = {
            amount: parseInt(amount),
            description: description || `Invoice for ${amount} sats`,
            expiry: 3600, // 1 hour expiry
            metadata: {
                buyerPubkey,
                timestamp: Date.now()
            }
        };

        console.log('Invoice options:', invoiceOptions);

        // Create invoice using CommerceManager
        const invoice = await commerce.createInvoice(invoiceOptions);
        
        console.log('Created invoice:', invoice);

        res.json({
            success: true,
            invoice: invoice,
            amount: amount
        });
    } catch (error) {
        console.error('Error creating invoice:', error);
        res.status(500).json({ 
            error: error.message,
            stack: error.stack
        });
    }
});

// Get payment status endpoint
app.get('/payment/:invoiceId', async (req, res) => {
    try {
        const { invoiceId } = req.params;
        console.log('Checking payment status for:', invoiceId);

        const payment = await commerce.getPayment(invoiceId);
        const isPaid = payment ? payment.status === 'paid' : false;
        
        res.json({
            success: true,
            invoiceId,
            status: isPaid ? 'paid' : 'pending',
            payment: payment
        });
    } catch (error) {
        console.error('Error checking payment:', error);
        res.status(500).json({ error: error.message });
    }
});

// Start NostrCommerce and Express server
async function startServer() {
    try {
        console.log('Starting NostrCommerce...');
        
        // Start NostrCommerce
        await nostrCommerce.start();
        console.log('NostrCommerce started successfully');

        // Subscribe to payments
        commerce.subscribeToPayments();

        // Set up payment listener
        commerce.on('paymentReceived', (payment) => {
            console.log('Payment received:', payment);
        });

        // Start Express server
        const PORT = process.env.PORT || 3001;
        app.listen(PORT, () => {
            console.log(`Store public key: ${publicKey}`);
            console.log(`Server running on http://localhost:${PORT}`);
        });

    } catch (error) {
        console.error('Failed to start server:', error);
        process.exit(1);
    }
}

// Handle graceful shutdown
process.on('SIGINT', async () => {
    console.log('Shutting down server...');
    await nostrCommerce.stop();
    process.exit(0);
});

// Start the server
startServer();