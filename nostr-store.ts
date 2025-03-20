import { NostrCommerce } from './src/core/NostrCommerce';
import { logger } from './src/core/logging';
import { EventEmitter } from 'events';

// Store configuration
const STORE_CONFIG = {
    name: "Digital Downloads Store",
    description: "A simple digital product store on Nostr",
    currency: "sats",
    owner: "ffb9d7006dd59ffd7eac468b0c08366a15b9c488df66964d7db69539580c3965" // Your public key
};

// Product catalog
const PRODUCTS = [
    {
        id: "ebook-1",
        name: "Getting Started with Nostr",
        description: "A comprehensive guide to Nostr protocol",
        price: 5000, // 5000 sats
        type: "ebook",
        deliveryUrl: "https://example.com/downloads/nostr-guide.pdf"
    },
    {
        id: "video-1",
        name: "Nostr Development Course",
        description: "Video course on Nostr development",
        price: 10000, // 10000 sats
        type: "video",
        deliveryUrl: "https://example.com/downloads/nostr-course.mp4"
    }
];

class NostrStore extends EventEmitter {
    private framework: any;
    private orders: Map<string, any>;

    constructor(privateKey: string, publicKey: string) {
        super();
        this.orders = new Map();
        
        this.framework = new NostrCommerce({
            relays: ['wss://relay.primal.net'],
            publicKey: publicKey,
            privateKey: privateKey
        });
    }

    async start() {
        try {
            await this.framework.start();
            logger.info('Nostr Store started successfully');
            
            // Set up payment listener
            this.framework.commerce.on('paymentReceived', (payment: any) => {
                this.handlePayment(payment);
            });

            return true;
        } catch (error) {
            logger.error('Failed to start store:', error);
            throw error;
        }
    }

    async stop() {
        try {
            await this.framework.stop();
            logger.info('Nostr Store stopped');
        } catch (error) {
            logger.error('Error stopping store:', error);
            throw error;
        }
    }

    getProducts() {
        return PRODUCTS;
    }

    getProduct(productId: string) {
        return PRODUCTS.find(p => p.id === productId);
    }

    async createOrder(productId: string, buyerPubkey: string) {
        const product = this.getProduct(productId);
        if (!product) {
            throw new Error('Product not found');
        }

        try {
            const orderId = `order-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
            
            const invoiceOptions = {
                amount: product.price,
                description: `Purchase of ${product.name}`,
                expiry: 3600, // 1 hour expiry
                metadata: {
                    orderId,
                    productId,
                    buyerPubkey
                }
            };

            const invoice = await this.framework.commerce.createInvoice(invoiceOptions);
            
            // Store order details
            this.orders.set(orderId, {
                id: orderId,
                product,
                buyerPubkey,
                status: 'pending',
                invoice,
                createdAt: new Date().toISOString()
            });

            logger.info('Order created:', { orderId, productId, buyerPubkey });
            
            return {
                orderId,
                invoice,
                amount: product.price,
                description: product.description
            };
        } catch (error) {
            logger.error('Error creating order:', error);
            throw error;
        }
    }

    private async handlePayment(payment: any) {
        try {
            const { orderId } = payment.metadata;
            const order = this.orders.get(orderId);
            
            if (!order) {
                logger.warn('Received payment for unknown order:', orderId);
                return;
            }

            // Update order status
            order.status = 'paid';
            order.paidAt = new Date().toISOString();
            this.orders.set(orderId, order);

            // Send delivery message to buyer
            await this.framework.interaction.sendMessage(
                JSON.stringify({
                    type: 'delivery',
                    orderId: order.id,
                    product: {
                        name: order.product.name,
                        deliveryUrl: order.product.deliveryUrl
                    }
                }),
                order.buyerPubkey
            );

            logger.info('Order fulfilled:', { orderId });
            
            // Emit order fulfilled event
            this.emit('orderFulfilled', order);
        } catch (error) {
            logger.error('Error handling payment:', error);
        }
    }

    getOrder(orderId: string) {
        return this.orders.get(orderId);
    }

    async verifyPayment(orderId: string) {
        const order = this.orders.get(orderId);
        if (!order) {
            throw new Error('Order not found');
        }

        try {
            const isPaid = await this.framework.commerce.verifyPayment(order.invoice);
            return isPaid;
        } catch (error) {
            logger.error('Error verifying payment:', error);
            throw error;
        }
    }
}

// Example usage
async function main() {
    const PRIVATE_KEY = '357c918594227743bcc2ffe0ff755bd29b3adcdb96e83a1b6b98cc17877163a1';
    const PUBLIC_KEY = 'ffb9d7006dd59ffd7eac468b0c08366a15b9c488df66964d7db69539580c3965';

    const store = new NostrStore(PRIVATE_KEY, PUBLIC_KEY);

    try {
        await store.start();

        // Print store information
        logger.info('Store Information:', STORE_CONFIG);
        logger.info('Available Products:', store.getProducts());

        // Example: Create an order
        const buyerPubkey = 'example-buyer-pubkey'; // This would come from the buyer's Nostr client
        const order = await store.createOrder('ebook-1', buyerPubkey);
        logger.info('Created order:', order);

        // Listen for fulfilled orders
        store.on('orderFulfilled', (fulfilledOrder) => {
            logger.info('Order has been fulfilled:', fulfilledOrder);
        });

        // Keep the store running
        logger.info('Store is running and ready to accept orders. Press Ctrl+C to exit.');
        
        process.on('SIGINT', async () => {
            logger.info('Shutting down store...');
            await store.stop();
            process.exit(0);
        });

    } catch (error) {
        logger.error('Store error:', error);
        await store.stop();
        process.exit(1);
    }
}

// Run the store
main().catch(error => logger.error('Unhandled error:', error));