# Nostr Commerce Framework API Documentation

## Core Framework

### NostrCommerce

The main framework class that handles connections to Nostr relays and provides core functionality.

```typescript
const framework = new NostrCommerce({
  relays: ['wss://relay.damus.io'],
  publicKey: 'your-public-key',
  privateKey: 'your-private-key',
});
```

#### Methods

- `start()`: Initialize the framework and connect to relays
- `stop()`: Clean up resources and close connections
- `publishEvent(event: Partial<NostrEvent>)`: Publish an event to the Nostr network
- `subscribe(filters: any[], callback: (event: NostrEvent) => void)`: Subscribe to events
- `registerPlugin(name: string, plugin: Plugin)`: Register a new plugin

## Modules

### InteractionManager

Handles messaging and user interactions.

```typescript
const interaction = new InteractionManager(framework);
```

#### Methods

- `sendMessage(content: string, recipient: string)`: Send a direct message
- `subscribe(callback: (event: NostrEvent) => void)`: Subscribe to incoming messages
- `cleanup()`: Clean up subscriptions

### CommerceManager

Handles payments and commerce-related functionality.

```typescript
const commerce = new CommerceManager(framework);
```

#### Methods

- `createInvoice(amount: number, description: string)`: Create a payment invoice
- `processTip(recipient: string, amount: number)`: Send a tip to a recipient
- `verifyPayment(invoiceId: string)`: Check if a payment has been received
- `cleanup()`: Clean up resources

## Events

The framework emits various events that you can listen to:

```typescript
framework.on('ready', () => {
  console.log('Framework is ready');
});

framework.on('relay:connected', (relay) => {
  console.log('Connected to relay:', relay);
});

framework.on('payment:received', ({ invoiceId, amount }) => {
  console.log('Payment received:', { invoiceId, amount });
});
```

## Plugin System

You can extend the framework's functionality by creating plugins:

```typescript
interface Plugin {
  onRegister?: (framework: NostrCommerce) => void;
  onInitialize?: () => void | Promise<void>;
  onStop?: () => void | Promise<void>;
}

const myPlugin: Plugin = {
  onRegister(framework) {
    // Setup plugin
  },
  onInitialize() {
    // Initialize plugin
  },
  onStop() {
    // Cleanup
  },
};

framework.registerPlugin('my-plugin', myPlugin);
```

## Error Handling

The framework uses standard error handling patterns:

```typescript
try {
  await framework.start();
} catch (error) {
  console.error('Failed to start framework:', error);
}
```

## Best Practices

1. Always call `cleanup()` on modules when you're done using them
2. Handle errors appropriately using try/catch blocks
3. Use TypeScript for better type safety and development experience
4. Follow the event-driven pattern for real-time updates
5. Implement proper error handling and logging

## Examples

See the `examples/` directory for complete usage examples:

- `basic-usage.ts`: Basic framework usage
- `plugin-example.ts`: Creating and using plugins
- `commerce-example.ts`: Implementing commerce features

## Contributing

Please see CONTRIBUTING.md for details on how to contribute to this project.