import express, { Request, Response } from 'express';
import cors from 'cors';
import path from 'path';
import { NostrCommerce } from 'nostr-commerce-framework';
import { NostrError, ErrorCode } from 'nostr-commerce-framework';
import sharp from 'sharp';
import fs from 'fs/promises';
import asyncHandler from 'express-async-handler';

interface ImageMetadata {
  id: string;
  title: string;
  description: string;
  price: number;
  filename: string;
}

export class ImageStore {
  private app = express();
  private framework: NostrCommerce;
  private images: Map<string, ImageMetadata> = new Map();
  private payments: Map<string, { imageId: string, paid: boolean }> = new Map();

  constructor() {
    // Initialize Nostr Commerce Framework
    this.framework = new NostrCommerce({
      relays: [process.env.NOSTR_RELAY_URL!],
      publicKey: process.env.NOSTR_PUBLIC_KEY!,
      privateKey: process.env.NOSTR_PRIVATE_KEY!
    });

    this.setupMiddleware();
    this.setupRoutes();
    this.setupPaymentListeners();
  }

  private setupMiddleware() {
    this.app.use(cors());
    this.app.use(express.json());
    this.app.use(express.static('public'));
    this.app.set('view engine', 'ejs');
    this.app.set('views', path.join(__dirname, '../views'));
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
      res.render('image', { image });
    }));

    // Get preview image (watermarked)
    this.app.get('/preview/:id', asyncHandler(async (req: Request, res: Response) => {
      const image = this.images.get(req.params.id);
      if (!image) {
        res.status(404).send('Image not found');
        return;
      }

      const imagePath = path.join(__dirname, '../assets', image.filename);
      const watermarked = await this.addWatermark(imagePath);
      
      res.type('image/jpeg').send(watermarked);
    }));

    // Create invoice for image purchase
    this.app.post('/purchase/:id', asyncHandler(async (req: Request, res: Response) => {
      const image = this.images.get(req.params.id);
      if (!image) {
        res.status(404).send('Image not found');
        return;
      }

      try {
        const invoiceId = await this.framework.commerce.createInvoice({
          amount: image.price,
          description: `Purchase of ${image.title}`,
          expiry: parseInt(process.env.DEFAULT_EXPIRY_SECONDS || '3600'),
          metadata: {
            imageId: image.id,
            type: 'image-purchase'
          }
        });

        this.payments.set(invoiceId, { imageId: image.id, paid: false });
        res.json({ invoiceId });
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

    // Check payment status
    this.app.get('/payment/:invoiceId', asyncHandler(async (req: Request, res: Response) => {
      const payment = this.payments.get(req.params.invoiceId);
      if (!payment) {
        res.status(404).send('Payment not found');
        return;
      }

      try {
        const isPaid = await this.framework.commerce.verifyPayment(req.params.invoiceId);
        res.json({ paid: isPaid });
      } catch (error) {
        res.status(500).json({
          error: 'VERIFICATION_FAILED',
          message: 'Failed to verify payment'
        });
      }
    }));

    // Download full image (requires valid payment)
    this.app.get('/download/:invoiceId', asyncHandler(async (req: Request, res: Response) => {
      const payment = this.payments.get(req.params.invoiceId);
      if (!payment) {
        res.status(404).send('Payment not found');
        return;
      }

      try {
        const isPaid = await this.framework.commerce.verifyPayment(req.params.invoiceId);
        if (!isPaid) {
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
      } catch (error) {
        res.status(500).send('Failed to process download');
      }
    }));
  }

  private setupPaymentListeners() {
    this.framework.commerce.on('paymentReceived', (payment) => {
      const paymentInfo = this.payments.get(payment.invoiceId);
      if (paymentInfo) {
        paymentInfo.paid = true;
        this.payments.set(payment.invoiceId, paymentInfo);
      }
    });

    this.framework.commerce.on('invoiceExpired', (invoiceId) => {
      this.payments.delete(invoiceId);
    });
  }

  private async addWatermark(imagePath: string): Promise<Buffer> {
    const watermarkText = process.env.WATERMARK_TEXT || 'PREVIEW';
    
    return sharp(imagePath)
      .resize(800) // Resize for preview
      .composite([{
        input: {
          text: {
            text: watermarkText,
            fontSize: 48,
            rgba: true
          }
        },
        gravity: 'center'
      }])
      .jpeg({ quality: 80 })
      .toBuffer();
  }

  async loadImages() {
    // Load sample images
    this.images.set('1', {
      id: '1',
      title: 'Mountain Landscape',
      description: 'Beautiful mountain landscape at sunset',
      price: 1000,
      filename: 'mountain.jpg'
    });

    this.images.set('2', {
      id: '2',
      title: 'Ocean View',
      description: 'Serene ocean view with waves',
      price: 1500,
      filename: 'ocean.jpg'
    });
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