# Plugin Development Guide

This guide provides comprehensive information on developing plugins for the Nostr Commerce Framework. Plugins allow you to extend the framework's functionality while maintaining a consistent architecture and security model.

## Table of Contents

1. [Plugin Architecture](#plugin-architecture)
2. [Creating a Plugin](#creating-a-plugin)
3. [Plugin Lifecycle](#plugin-lifecycle)
4. [API Reference](#api-reference)
5. [Best Practices](#best-practices)
6. [Examples](#examples)

## Plugin Architecture

### Overview

Plugins in the Nostr Commerce Framework follow a modular architecture that allows for:
- Event handling
- State management
- Custom functionality
- Integration with core services

### Plugin Interface

```typescript
interface Plugin {
  // Required plugin metadata
  name: string;
  version: string;
  description: string;

  // Lifecycle methods
  init(): Promise<void>;
  destroy(): Promise<void>;

  // Event handlers
  handlers: Map<string, EventHandler>;

  // Optional methods
  configure?(options: any): Promise<void>;
  status?(): Promise<PluginStatus>;
}

interface EventHandler {
  handle(event: Event): Promise<void>;
}
```

## Creating a Plugin

### Basic Plugin Structure

```typescript
import { Plugin, Event, EventHandler } from '@nostr-commerce/core';

export class MyCustomPlugin implements Plugin {
  name = 'my-custom-plugin';
  version = '1.0.0';
  description = 'A custom plugin for Nostr Commerce Framework';
  
  private handlers = new Map<string, EventHandler>();

  constructor() {
    // Initialize handlers
    this.handlers.set('custom.event', new CustomEventHandler());
  }

  async init(): Promise<void> {
    // Plugin initialization logic
    console.log('Plugin initialized');
  }

  async destroy(): Promise<void> {
    // Cleanup logic
    console.log('Plugin destroyed');
  }
}
```

### Event Handler Implementation

```typescript
class CustomEventHandler implements EventHandler {
  async handle(event: Event): Promise<void> {
    // Handle the event
    console.log('Handling event:', event);
  }
}
```

## Plugin Lifecycle

### 1. Registration

```typescript
// Register plugin with the framework
const framework = new NostrCommerce();
await framework.registerPlugin(new MyCustomPlugin());
```

### 2. Initialization

```typescript
// Plugin initialization
async init(): Promise<void> {
  // Set up resources
  await this.setupResources();
  
  // Register event handlers
  this.registerHandlers();
  
  // Initialize state
  await this.initializeState();
}
```

### 3. Event Handling

```typescript
// Event handling
class PaymentEventHandler implements EventHandler {
  async handle(event: PaymentEvent): Promise<void> {
    // Validate event
    if (!this.validateEvent(event)) {
      throw new Error('Invalid event');
    }
    
    // Process payment
    await this.processPayment(event);
    
    // Emit result
    this.emitResult(event);
  }
}
```

### 4. Cleanup

```typescript
// Plugin cleanup
async destroy(): Promise<void> {
  // Clean up resources
  await this.cleanupResources();
  
  // Clear state
  this.clearState();
  
  // Remove handlers
  this.handlers.clear();
}
```

## API Reference

### Core Plugin Methods

#### init()
Initialize the plugin and its resources.

```typescript
async init(): Promise<void> {
  // Initialization logic
}
```

#### destroy()
Clean up plugin resources.

```typescript
async destroy(): Promise<void> {
  // Cleanup logic
}
```

#### configure()
Configure plugin options.

```typescript
async configure(options: PluginOptions): Promise<void> {
  // Configuration logic
}
```

### Event Handling

#### registerHandler()
Register an event handler.

```typescript
registerHandler(eventType: string, handler: EventHandler): void {
  this.handlers.set(eventType, handler);
}
```

#### handleEvent()
Handle an incoming event.

```typescript
async handleEvent(event: Event): Promise<void> {
  const handler = this.handlers.get(event.type);
  if (handler) {
    await handler.handle(event);
  }
}
```

## Best Practices

### 1. Error Handling

```typescript
class SafeEventHandler implements EventHandler {
  async handle(event: Event): Promise<void> {
    try {
      // Handle event
      await this.processEvent(event);
    } catch (error) {
      // Log error
      this.logError(error);
      
      // Emit error event
      await this.emitError(error);
      
      // Rethrow if necessary
      throw error;
    }
  }
}
```

### 2. State Management

```typescript
class StatefulPlugin implements Plugin {
  private state: PluginState;

  async init(): Promise<void> {
    this.state = await this.loadState();
  }

  private async loadState(): Promise<PluginState> {
    // Load state from storage
  }

  private async saveState(): Promise<void> {
    // Save state to storage
  }
}
```

### 3. Resource Management

```typescript
class ResourcefulPlugin implements Plugin {
  private resources: Resource[];

  async init(): Promise<void> {
    await this.acquireResources();
  }

  async destroy(): Promise<void> {
    await this.releaseResources();
  }
}
```

## Examples

### 1. Payment Processing Plugin

```typescript
import { Plugin, PaymentEvent } from '@nostr-commerce/core';

export class PaymentPlugin implements Plugin {
  name = 'payment-processor';
  version = '1.0.0';
  
  private handlers = new Map<string, EventHandler>();

  constructor() {
    this.handlers.set('payment.process', new PaymentProcessor());
  }

  async init(): Promise<void> {
    // Initialize payment processor
    await this.setupPaymentProcessor();
  }
}

class PaymentProcessor implements EventHandler {
  async handle(event: PaymentEvent): Promise<void> {
    // Process payment
    const result = await this.processPayment(event);
    
    // Emit result
    await this.emitPaymentResult(result);
  }
}
```

### 2. Analytics Plugin

```typescript
export class AnalyticsPlugin implements Plugin {
  name = 'analytics';
  version = '1.0.0';
  
  private handlers = new Map<string, EventHandler>();
  private metrics: MetricsCollector;

  constructor() {
    this.handlers.set('*.event', new EventAnalyzer());
    this.metrics = new MetricsCollector();
  }

  async init(): Promise<void> {
    await this.metrics.initialize();
  }
}
```

### 3. Custom Integration Plugin

```typescript
export class IntegrationPlugin implements Plugin {
  name = 'custom-integration';
  version = '1.0.0';
  
  private handlers = new Map<string, EventHandler>();
  private client: ExternalClient;

  constructor() {
    this.handlers.set('integration.event', new IntegrationHandler());
  }

  async init(): Promise<void> {
    this.client = await ExternalClient.connect();
  }
}
```