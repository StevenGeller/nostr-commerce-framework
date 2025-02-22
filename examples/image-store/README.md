# Nostr Image Store Example

This example demonstrates how to build a simple image store using the Nostr Commerce Framework. Users can browse images, purchase them using Lightning Network payments or Nostr Zaps, and download the full resolution versions after payment.

## Features

- Image preview with watermark
- Multiple payment options:
  - Lightning Network invoices
  - Nostr Zaps (NIP-57)
- Automatic payment verification
- Full resolution image download after payment
- Responsive web interface
- Nostr event integration for:
  - Image listings
  - Purchase records
  - Payment verification

## Setup

1. Install dependencies:
   ```bash
   npm install
   ```

2. Create a `.env` file with your configuration:
   ```env
   NOSTR_PUBLIC_KEY=your_public_key
   NOSTR_PRIVATE_KEY=your_private_key
   NOSTR_RELAY_URL=wss://relay.primal.net
   LIGHTNING_ADDRESS=your_lightning_address@getalby.com
   PORT=3000
   APP_NAME=Nostr Image Store
   WATERMARK_TEXT=PREVIEW
   ```

3. Add some sample images to the `assets` directory:
   - mountain.jpg
   - ocean.jpg

4. Build and start the application:
   ```bash
   npm run build
   npm start
   ```

## Usage

1. Visit `http://localhost:3000` in your browser
2. Browse available images
3. Click on an image to view details
4. Connect your Nostr extension (nos2x or Alby)
5. Choose payment method:
   - Lightning Invoice: Get a BOLT11 invoice
   - Zap: Send a Zap through your Nostr client
6. Complete payment
7. Download the full resolution image

## Payment Methods

### Lightning Invoice
- Traditional BOLT11 invoice
- Direct Lightning Network payment
- Automatic verification

### Nostr Zaps
- Uses NIP-57 for Zap payments
- Requires Nostr extension with Zap support
- Automatically creates purchase record
- Verifiable on Nostr network

## Development

```bash
# Run in development mode with hot reload
npm run dev

# Build the project
npm run build

# Start the built version
npm start
```

## Project Structure

```
.
├── src/
│   ├── index.ts        # Application entry point
│   └── server.ts       # Main server implementation
├── views/
│   ├── layout.ejs      # Base layout template
│   ├── index.ejs       # Image gallery page
│   └── image.ejs       # Image details page
├── public/             # Static files
├── assets/            # Full resolution images
└── .env               # Configuration
```

## Nostr Integration

### Events
- `kind:30001` - Image listings
- `kind:30000` - Purchase records
- `kind:9735` - Zap receipts

### Tags
- `p` - Buyer/Seller pubkeys
- `i` - Image reference
- `payment` - Payment type
- `proof` - Payment proof
- `amount` - Payment amount
- `lud16` - Lightning address

## Security Considerations

- Images are watermarked for preview
- Payments verified through Lightning Network or Nostr
- Zap verification through event validation
- Downloads protected until payment
- Purchase records on Nostr
- Environment variables for sensitive data

## Required Extensions

- Nostr extension (nos2x or Alby)
- Lightning wallet support
- Zap support in Nostr client

## License

MIT License - See main project for details