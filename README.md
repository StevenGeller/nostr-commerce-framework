# Nostr Commerce Framework

A comprehensive, open-source framework for building advanced interaction and commerce features on the Nostr protocol, with integrated support for Bitcoin, Lightning Network, and Nostr Zaps.

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

> 🚧 **Project Status**: Under active development - Not yet published to npm

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

## Documentation

Our documentation is organized into several comprehensive guides:

- [**API Reference**](docs/API.md) - Complete API documentation and usage examples
- [**Architecture Overview**](docs/ARCHITECTURE.md) - System design and core components
- [**Security Best Practices**](docs/SECURITY.md) - Security guidelines and implementation
- [**Plugin Development**](docs/PLUGINS.md) - Guide for creating and managing plugins
- [**Commerce Integration**](docs/COMMERCE.md) - Payment processing and commerce features

## Quick Start

### Installation

```bash
# Not yet published to npm
npm install nostr-commerce-framework
```

### Basic Usage

```typescript
import { NostrCommerce } from 'nostr-commerce-framework';

// Initialize the framework with Primal relay
const framework = new NostrCommerce({
  relays: ['wss://relay.primal.net'],  // Using Primal's high-performance relay
  publicKey: 'your-public-key',
  privateKey: 'your-private-key'
});

// Start the framework
await framework.start();

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

### Relay Configuration

The framework supports various Nostr relays. By default, we recommend using Primal's relay (`wss://relay.primal.net`) for its:
- High performance and reliability
- Good global connectivity
- Support for all standard Nostr event types
- Robust infrastructure

You can also use multiple relays for redundancy:

```typescript
const framework = new NostrCommerce({
  relays: [
    'wss://relay.primal.net',  // Primary relay
    'wss://relay.example.com', // Backup relay
  ],
  publicKey: 'your-public-key',
  privateKey: 'your-private-key'
});
```

## Development

### Prerequisites

- Node.js (v16 or higher)
- npm or yarn
- Basic understanding of Nostr protocol
- (Optional) Bitcoin and Lightning Network nodes for testing

### Local Setup

1. Clone the repository:
   ```bash
   git clone https://github.com/StevenGeller/nostr-commerce-framework.git
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

### Configuration

Create a `.env` file based on `.env.example`:

```env
# Required Configuration
RELAY_URLS=wss://relay.primal.net
PUBLIC_KEY=your-public-key
PRIVATE_KEY=your-private-key

# Optional Bitcoin/Lightning Configuration
BITCOIN_RPC_URL=http://localhost:8332
LIGHTNING_NODE_URL=https://localhost:9735
```

## Testing

```bash
# Run all tests
npm test

# Run tests with coverage
npm run test:coverage

# Run specific test suite
npm test -- -t "Commerce Module"
```

### Integration Testing

For Bitcoin and Lightning Network integration testing:

1. Set up a local Bitcoin node (or use regtest)
2. Configure Lightning Network node
3. Update `.env` with connection details
4. Run integration tests:
   ```bash
   npm run test:integration
   ```

## Contributing

We welcome contributions! Please see our [Contributing Guidelines](CONTRIBUTING.md) for details.

### Development Workflow

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## Security

For security concerns, please open a security advisory on GitHub. See our [Security Best Practices](docs/SECURITY.md) for more information.

## Support

- GitHub Issues: [Report bugs or request features](https://github.com/StevenGeller/nostr-commerce-framework/issues)

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Acknowledgments

- Nostr Protocol community
- Bitcoin and Lightning Network developers
- Primal team for their high-performance relay
- All contributors and supporters