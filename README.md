# Nostr Commerce Framework

A comprehensive, open-source framework for building advanced interaction and commerce features on the Nostr protocol, with integrated support for Bitcoin, Lightning Network, and Nostr Zaps.

[![Build Status](https://github.com/stevengeller/nostr-commerce-framework/workflows/CI/badge.svg)](https://github.com/stevengeller/nostr-commerce-framework/actions)
[![npm version](https://badge.fury.io/js/nostr-commerce-framework.svg)](https://badge.fury.io/js/nostr-commerce-framework)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

## Features

- **Comprehensive Commerce Integration**
  - Bitcoin transaction support
  - Lightning Network payment processing
  - Nostr Zaps integration
  - Invoice generation and management
  - Payment verification and callbacks

- **Real-time Interaction**
  - Secure messaging and notifications
  - Event-driven architecture
  - Robust error handling
  - Rate limiting and validation

- **Developer-Friendly**
  - TypeScript support
  - Extensive documentation
  - Comprehensive test coverage
  - Plugin system for extensibility

## Prerequisites

- Node.js (v16 or higher)
- npm or yarn
- Basic understanding of Nostr protocol
- (Optional) Bitcoin and Lightning Network nodes for testing

## Quick Start

### Installation

```bash
npm install nostr-commerce-framework
```

### Configuration

Create a `.env` file based on `.env.example`:

```env
# Required Configuration
RELAY_URLS=wss://relay1.com,wss://relay2.com
PUBLIC_KEY=your-public-key
PRIVATE_KEY=your-private-key

# Optional Bitcoin/Lightning Configuration
BITCOIN_RPC_URL=http://localhost:8332
LIGHTNING_NODE_URL=https://localhost:9735
```

### Basic Usage

```typescript
import { NostrCommerce } from 'nostr-commerce-framework';

// Initialize the framework
const framework = new NostrCommerce({
  relays: ['wss://relay.damus.io'],
  publicKey: process.env.PUBLIC_KEY,
  privateKey: process.env.PRIVATE_KEY
});

// Start the framework
await framework.start();

// Send a message
const messageId = await framework.interaction.sendMessage(
  'Hello Nostr!',
  'recipient-public-key'
);

// Create an invoice
const invoice = await framework.commerce.createInvoice({
  amount: 1000, // sats
  description: 'Test payment'
});

// Process a Lightning payment
framework.commerce.on('paymentReceived', (payment) => {
  console.log('Payment received:', payment);
});
```

## Local Development

1. Clone the repository:
   ```bash
   git clone https://github.com/stevengeller/nostr-commerce-framework.git
   cd nostr-commerce-framework
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Build the project:
   ```bash
   npm run build
   ```

4. Run tests:
   ```bash
   npm test
   ```

5. Run the example application:
   ```bash
   npm run example
   ```

## Testing

The framework includes comprehensive tests for all components:

```bash
# Run all tests
npm test

# Run tests with coverage
npm run test:coverage

# Run specific test suite
npm test -- -t "Commerce Module"
```

### Integration Testing

To test Bitcoin and Lightning Network integration:

1. Set up a local Bitcoin node (or use regtest)
2. Configure Lightning Network node (LND, c-lightning, etc.)
3. Update `.env` with appropriate connection details
4. Run integration tests:
   ```bash
   npm run test:integration
   ```

## Documentation

- [API Reference](docs/API.md)
- [Architecture Overview](docs/ARCHITECTURE.md)
- [Security Best Practices](docs/SECURITY.md)
- [Plugin Development](docs/PLUGINS.md)
- [Commerce Integration](docs/COMMERCE.md)

## Contributing

We welcome contributions! Please see our [Contributing Guidelines](CONTRIBUTING.md) for details.

### Development Workflow

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## Security

For security concerns, please open a security advisory on GitHub.

## Support

- GitHub Issues: [Report bugs or request features](https://github.com/stevengeller/nostr-commerce-framework/issues)
- GitHub Discussions: [Ask questions and discuss](https://github.com/stevengeller/nostr-commerce-framework/discussions)

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Acknowledgments

- Nostr Protocol community
- Bitcoin and Lightning Network developers
- All contributors and supporters
