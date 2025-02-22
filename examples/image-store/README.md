# Nostr Image Store Example

This example demonstrates how to build a simple image store using the Nostr Commerce Framework. Users can browse images, purchase them using Lightning Network payments, and download the full resolution versions after payment.

## Features

- Image preview with watermark
- Lightning Network payments
- Automatic payment verification
- Full resolution image download after payment
- Responsive web interface

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
4. Click "Purchase Image" to generate a Lightning invoice
5. Pay the invoice using your Lightning wallet
6. Download the full resolution image

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

## Security Considerations

- Images are watermarked for preview
- Payments are verified before download
- Full resolution images are protected
- Environment variables for sensitive data

## License

MIT License - See main project for details