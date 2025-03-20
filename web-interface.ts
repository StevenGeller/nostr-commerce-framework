import express from 'express';
import { NostrStore } from './nostr-store';
import { logger } from './src/core/logging';

const app = express();
const port = 3000;

// Store configuration
const PRIVATE_KEY = '357c918594227743bcc2ffe0ff755bd29b3adcdb96e83a1b6b98cc17877163a1';
const PUBLIC_KEY = 'ffb9d7006dd59ffd7eac468b0c08366a15b9c488df66964d7db69539580c3965';

// Initialize store
const store = new NostrStore(PRIVATE_KEY, PUBLIC_KEY);

// Configure Express
app.set('view engine', 'ejs');
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Routes
app.get('/', (req, res) => {
    const products = store.getProducts();
    res.render('store', { products });
});

app.post('/create-order', async (req, res) => {
    try {
        const { productId, buyerPubkey } = req.body;
        const order = await store.createOrder(productId, buyerPubkey);
        res.json(order);
    } catch (error) {
        logger.error('Error creating order:', error);
        res.status(500).json({ error: 'Failed to create order' });
    }
});

app.get('/order/:orderId', async (req, res) => {
    try {
        const order = store.getOrder(req.params.orderId);
        if (!order) {
            return res.status(404).json({ error: 'Order not found' });
        }
        res.render('order', { order });
    } catch (error) {
        logger.error('Error fetching order:', error);
        res.status(500).json({ error: 'Failed to fetch order' });
    }
});

app.get('/verify-payment/:orderId', async (req, res) => {
    try {
        const isPaid = await store.verifyPayment(req.params.orderId);
        res.json({ paid: isPaid });
    } catch (error) {
        logger.error('Error verifying payment:', error);
        res.status(500).json({ error: 'Failed to verify payment' });
    }
});

// Start the store and server
async function main() {
    try {
        await store.start();
        logger.info('Nostr Store started successfully');

        app.listen(port, () => {
            logger.info(`Store web interface running at http://localhost:${port}`);
        });

        // Handle store events
        store.on('orderFulfilled', (order) => {
            logger.info('Order fulfilled:', order);
        });

    } catch (error) {
        logger.error('Failed to start store:', error);
        process.exit(1);
    }
}

// Graceful shutdown
process.on('SIGINT', async () => {
    logger.info('Shutting down...');
    await store.stop();
    process.exit(0);
});

main().catch(error => logger.error('Unhandled error:', error));