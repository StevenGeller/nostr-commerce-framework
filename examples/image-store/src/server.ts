import express, { Request, Response } from 'express';
import cors from 'cors';
import path from 'path';
import { NostrCommerce } from 'nostr-commerce-framework';
import { NostrError, ErrorCode } from 'nostr-commerce-framework';
import { NostrEvent } from 'nostr-commerce-framework';
import sharp from 'sharp';
import fs from 'fs/promises';
import asyncHandler from 'express-async-handler';

interface ImageMetadata {
  id: string;
  title: string;
  description: string;
  price: number;
  filename: string;
  pubkey: string;  // Seller's Nostr pubkey
  lud16?: string;  // Lightning Address for Zaps
}

interface PurchaseEvent {
  kind: number;
  imageId: string;
  buyerPubkey: string;
  price: number;
  timestamp: number;
  paymentType: 'invoice' | 'zap';
  paymentProof?: string;  // Invoice ID or Zap event ID
}

export class ImageStore {
  private app = express();
  private framework: NostrCommerce;
  private images: Map<string, ImageMetadata> = new Map();
  private payments: Map<string, { 
    imageId: string, 
    paid: boolean,
    buyerPubkey?: string,
    purchaseEventId?: string,
    paymentType: 'invoice' | 'zap'
  }> = new Map();

  // Nostr event kinds
  private readonly PURCHASE_EVENT_KIND = 30000;  // Custom event kind for purchases
  private readonly IMAGE_LIST_KIND = 30001;      // Custom event kind for image listings
  private readonly ZAP_EVENT_KIND = 9735;        // Standard Zap event kind

  constructor() {
    this.framework = new NostrCommerce({
      relays: [process.env.NOSTR_RELAY_URL!],
      publicKey: process.env.NOSTR_PUBLIC_KEY!,
      privateKey: process.env.NOSTR_PRIVATE_KEY!
    });

    this.setupMiddleware();
    this.setupRoutes();
    this.setupNostrListeners();
  }

  private setupMiddleware() {
    this.app.use(cors());
    this.app.use(express.json());
    this.app.use(express.static('public'));
    this.app.set('view engine', 'ejs');
    this.app.set('views', path.join(__dirname, '../views'));
  }

  private setupNostrListeners() {
    // Listen for regular Lightning payments
    this.framework.commerce.on('paymentReceived', async (payment) => {
      await this.handlePaymentSuccess(payment.invoiceId, 'invoice');
    });

    // Listen for Zap events
    this.framework.subscribe(
      [{ kinds: [this.ZAP_EVENT_KIND] }],
      this.handleZapEvent.bind(this)
    );

    // Listen for purchase events
    this.framework.subscribe(
      [{ kinds: [this.PURCHASE_EVENT_KIND] }],
      this.handlePurchaseEvent.bind(this)
    );

    // Listen for image listing events
    this.framework.subscribe(
      [{ kinds: [this.IMAGE_LIST_KIND] }],
      this.handleImageListEvent.bind(this)
    );
  }

  private async handlePaymentSuccess(paymentId: string, paymentType: 'invoice' | 'zap') {
    const paymentInfo = this.payments.get(paymentId);
    if (paymentInfo) {
      paymentInfo.paid = true;
      paymentInfo.paymentType = paymentType;
      this.payments.set(paymentId, paymentInfo);

      // Create a purchase event on Nostr
      if (paymentInfo.buyerPubkey) {
        await this.publishPurchaseEvent(
          paymentInfo.imageId,
          paymentInfo.buyerPubkey,
          paymentId,
          paymentType
        );
      }
    }
  }

  private async handleZapEvent(event: NostrEvent) {
    try {
      // Extract zap amount and recipient from the event
      const zapAmount = parseInt(event.tags.find(t => t[0] === 'amount')?.[1] || '0');
      const recipient = event.tags.find(t => t[0] === 'p')?.[1];
      const zapId = event.id;

      // Find matching image by price and seller
      const image = Array.from(this.images.values()).find(img => 
        img.price === zapAmount && img.pubkey === recipient
      );

      if (image && event.pubkey) {
        // Create or update payment record
        this.payments.set(zapId, {
          imageId: image.id,
          paid: true,
          buyerPubkey: event.pubkey,
          paymentType: 'zap'
        });

        await this.handlePaymentSuccess(zapId, 'zap');
      }
    } catch (error) {
      console.error('Failed to handle zap event:', error);
    }
  }

  private async publishPurchaseEvent(
    imageId: string,
    buyerPubkey: string,
    paymentId: string,
    paymentType: 'invoice' | 'zap'
  ) {
    const image = this.images.get(imageId);
    if (!image) return;

    const purchaseEvent: PurchaseEvent = {
      kind: this.PURCHASE_EVENT_KIND,
      imageId,
      buyerPubkey,
      price: image.price,
      timestamp: Math.floor(Date.now() / 1000),
      paymentType,
      paymentProof: paymentId
    };

    try {
      const eventId = await this.framework.publish({
        kind: this.PURCHASE_EVENT_KIND,
        content: JSON.stringify(purchaseEvent),
        tags: [
          ['p', buyerPubkey],          // Tag buyer
          ['p', image.pubkey],         // Tag seller
          ['i', imageId],              // Image reference
          ['payment', paymentType],    // Payment type
          ['proof', paymentId]         // Payment proof
        ]
      });

      // Update payment record with event ID
      const paymentInfo = this.payments.get(paymentId);
      if (paymentInfo) {
        paymentInfo.purchaseEventId = eventId;
        this.payments.set(paymentId, paymentInfo);
      }
    } catch (error) {
      console.error('Failed to publish purchase event:', error);
    }
  }

  private async publishImageListing(image: ImageMetadata) {
    try {
      await this.framework.publish({
        kind: this.IMAGE_LIST_KIND,
        content: JSON.stringify({
          id: image.id,
          title: image.title,
          description: image.description,
          price: image.price,
          preview: `/preview/${image.id}`,
          lud16: image.lud16
        }),
        tags: [
          ['p', image.pubkey],     // Seller
          ['t', 'image-listing'],  // Type tag
          ['price', image.price.toString()],  // Price tag
          ['lud16', image.lud16 || '']  // Lightning address for Zaps
        ]
      });
    } catch (error) {
      console.error('Failed to publish image listing:', error);
    }
  }

  private setupRoutes() {
    // Home page - list all images
    this.app.get('/', asyncHandler(async (req: Request, res: Response) => {
      const images = Array.from(this.images.values());
      res.render('index', { images });
    }));

    // Image details page
    this.app.get('/image/:id', asyncHandler(async (req: Request, res: Response) => {
      const image = this.images.get(req.params.id);
      if (!image) {
        res.status(404).send('Image not found');
        return;
      }
      res.render('image', { 
        image,
        nostrPublicKey: process.env.NOSTR_PUBLIC_KEY
      });
    }));

    // Verify payment (both invoice and zap)
    this.app.get('/payment/:id', asyncHandler(async (req: Request, res: Response) => {
      const payment = this.payments.get(req.params.id);
      if (!payment) {
        res.status(404).send('Payment not found');
        return;
      }

      try {
        let isPaid = payment.paid;
        if (payment.paymentType === 'invoice') {
          // Double-check invoice payment
          isPaid = await this.framework.commerce.verifyPayment(req.params.id);
        }

        res.json({ 
          paid: isPaid,
          purchaseEventId: payment.purchaseEventId,
          paymentType: payment.paymentType
        });
      } catch (error) {
        res.status(500).json({
          error: 'VERIFICATION_FAILED',
          message: 'Failed to verify payment'
        });
      }
    }));

    // Create invoice (traditional Lightning payment)
    this.app.post('/purchase/:id', asyncHandler(async (req: Request, res: Response) => {
      const image = this.images.get(req.params.id);
      if (!image) {
        res.status(404).send('Image not found');
        return;
      }

      const buyerPubkey = req.body.buyerPubkey;
      if (!buyerPubkey) {
        res.status(400).send('Buyer public key required');
        return;
      }

      try {
        const invoiceId = await this.framework.commerce.createInvoice({
          amount: image.price,
          description: `Purchase of ${image.title}`,
          expiry: parseInt(process.env.DEFAULT_EXPIRY_SECONDS || '3600'),
          metadata: {
            imageId: image.id,
            type: 'image-purchase',
            buyerPubkey
          }
        });

        this.payments.set(invoiceId, { 
          imageId: image.id, 
          paid: false,
          buyerPubkey,
          paymentType: 'invoice'
        });
        
        res.json({ 
          invoiceId,
          lud16: image.lud16  // Include Lightning address for Zap option
        });
      } catch (error) {
        if (error instanceof NostrError) {
          res.status(400).json({
            error: error.code,
            message: error.message
          });
        } else {
          res.status(500).json({
            error: 'INTERNAL_ERROR',
            message: 'Failed to create invoice'
          });
        }
      }
    }));

    // Download route
    this.app.get('/download/:paymentId', asyncHandler(async (req: Request, res: Response) => {
      const payment = this.payments.get(req.params.paymentId);
      if (!payment || !payment.paid) {
        res.status(402).send('Payment required');
        return;
      }

      const image = this.images.get(payment.imageId);
      if (!image) {
        res.status(404).send('Image not found');
        return;
      }

      const imagePath = path.join(__dirname, '../assets', image.filename);
      res.download(imagePath, image.filename);
    }));
  }

  async loadImages() {
    // Load sample images with seller information
    this.images.set('1', {
      id: '1',
      title: 'Mountain Landscape',
      description: 'Beautiful mountain landscape at sunset',
      price: 1000,
      filename: 'mountain.jpg',
      pubkey: process.env.NOSTR_PUBLIC_KEY!,
      lud16: process.env.LIGHTNING_ADDRESS  // e.g., user@getalby.com
    });

    // Publish listings to Nostr
    for (const image of this.images.values()) {
      await this.publishImageListing(image);
    }
  }

  async start() {
    try {
      await this.framework.start();
      await this.loadImages();
      
      const port = process.env.PORT || 3000;
      this.app.listen(port, () => {
        console.log(`Image store running on http://localhost:${port}`);
      });
    } catch (error) {
      console.error('Failed to start image store:', error);
      process.exit(1);
    }
  }

  async stop() {
    await this.framework.stop();
  }
}