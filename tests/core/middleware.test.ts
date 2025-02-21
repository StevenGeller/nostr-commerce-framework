import { NostrError, ErrorCode } from '../../src/core/errors';
import { MiddlewareChain, validateEvent, sanitizeContent, validatePayment } from '../../src/core/middleware';
import { mockEvent } from '../mocks/nostr-tools';
import { MiddlewareContext } from '../../src/core/types/middleware';

describe('Middleware Tests', () => {
  let chain: MiddlewareChain;

  beforeEach(() => {
    chain = new MiddlewareChain();
  });

  describe('Event Validation', () => {
    beforeEach(() => {
      chain.use(validateEvent);
    });

    it('should pass valid events', async () => {
      const context: MiddlewareContext = {
        event: mockEvent,
        timestamp: Date.now()
      };
      
      await expect(chain.execute(context)).resolves.not.toThrow();
    });

    it('should reject invalid events', async () => {
      const context: MiddlewareContext = {
        event: { ...mockEvent, kind: undefined },
        timestamp: Date.now()
      };
      
      await expect(chain.execute(context)).rejects.toThrow(NostrError);
    });

    it('should handle missing events', async () => {
      const context: MiddlewareContext = {
        timestamp: Date.now()
      };
      
      await expect(chain.execute(context)).resolves.not.toThrow();
    });
  });

  describe('Content Sanitization', () => {
    beforeEach(() => {
      chain.use(sanitizeContent);
    });

    it('should remove XSS vectors', async () => {
      const context: MiddlewareContext = {
        event: {
          ...mockEvent,
          content: '<script>alert("xss")</script>Hello'
        },
        timestamp: Date.now()
      };
      
      await chain.execute(context);
      expect(context.event?.content).toBe('Hello');
    });

    it('should handle missing content', async () => {
      const context: MiddlewareContext = {
        event: { ...mockEvent, content: undefined },
        timestamp: Date.now()
      };
      
      await expect(chain.execute(context)).resolves.not.toThrow();
    });
  });

  describe('Payment Validation', () => {
    beforeEach(() => {
      chain.use(validatePayment);
    });

    it('should validate correct payment data', async () => {
      const context: MiddlewareContext = {
        timestamp: Date.now(),
        metadata: {
          payment: {
            amount: 100,
            recipient: 'test-recipient'
          }
        }
      };
      
      await expect(chain.execute(context)).resolves.not.toThrow();
    });

    it('should reject invalid payment amounts', async () => {
      const context: MiddlewareContext = {
        timestamp: Date.now(),
        metadata: {
          payment: {
            amount: -100,
            recipient: 'test-recipient'
          }
        }
      };
      
      await expect(chain.execute(context)).rejects.toThrow(NostrError);
    });

    it('should handle missing payment data', async () => {
      const context: MiddlewareContext = {
        timestamp: Date.now()
      };
      
      await expect(chain.execute(context)).resolves.not.toThrow();
    });
  });

  describe('Middleware Chain', () => {
    it('should execute multiple middleware in order', async () => {
      const order: number[] = [];
      const context: MiddlewareContext = { timestamp: Date.now() };

      chain.use(async (_, next) => {
        order.push(1);
        await next();
      });

      chain.use(async (_, next) => {
        order.push(2);
        await next();
      });

      await chain.execute(context);
      expect(order).toEqual([1, 2]);
    });

    it('should handle errors in middleware', async () => {
      const context: MiddlewareContext = { timestamp: Date.now() };

      chain.use(async () => {
        throw new NostrError(
          ErrorCode.INTERNAL_ERROR,
          'Test error'
        );
      });

      await expect(chain.execute(context)).rejects.toThrow(NostrError);
    });

    it('should stop execution on error', async () => {
      const executed: number[] = [];
      const context: MiddlewareContext = { timestamp: Date.now() };

      chain.use(async () => {
        executed.push(1);
        throw new Error('Stop here');
      });

      chain.use(async () => {
        executed.push(2);
      });

      await expect(chain.execute(context)).rejects.toThrow();
      expect(executed).toEqual([1]);
    });
  });
});