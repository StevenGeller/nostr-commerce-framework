import { MiddlewareChain, validateEvent, sanitizeContent, validatePayment } from '../../src/core/middleware';
import { NostrError, ErrorCode } from '../../src/core/errors';
import { mockEvent } from '../mocks/nostr-tools';

describe('Middleware Tests', () => {
  let chain: MiddlewareChain;

  beforeEach(() => {
    chain = new MiddlewareChain();
  });

  describe('Event Validation', () => {
    it('should pass valid events', async () => {
      const context = { event: mockEvent, timestamp: Date.now() };
      chain.use(validateEvent);
      
      await expect(chain.execute(context)).resolves.not.toThrow();
    });

    it('should reject events without required fields', async () => {
      const invalidEvent = { ...mockEvent, kind: undefined };
      const context = { event: invalidEvent, timestamp: Date.now() };
      chain.use(validateEvent);
      
      await expect(chain.execute(context)).rejects.toThrow(NostrError);
    });
  });

  describe('Content Sanitization', () => {
    it('should remove XSS vectors', async () => {
      const event = {
        ...mockEvent,
        content: '<script>alert("xss")</script>Hello'
      };
      const context = { event, timestamp: Date.now() };
      chain.use(sanitizeContent);
      
      await chain.execute(context);
      expect(context.event.content).toBe('Hello');
    });

    it('should handle null content', async () => {
      const event = { ...mockEvent, content: undefined };
      const context = { event, timestamp: Date.now() };
      chain.use(sanitizeContent);
      
      await expect(chain.execute(context)).resolves.not.toThrow();
    });
  });

  describe('Payment Validation', () => {
    it('should validate correct payment data', async () => {
      const context = {
        timestamp: Date.now(),
        metadata: {
          payment: {
            amount: 100,
            recipient: 'test-recipient'
          }
        }
      };
      chain.use(validatePayment);
      
      await expect(chain.execute(context)).resolves.not.toThrow();
    });

    it('should reject invalid payment amounts', async () => {
      const context = {
        timestamp: Date.now(),
        metadata: {
          payment: {
            amount: -100,
            recipient: 'test-recipient'
          }
        }
      };
      chain.use(validatePayment);
      
      await expect(chain.execute(context)).rejects.toThrow(NostrError);
    });
  });

  describe('Middleware Chain', () => {
    it('should execute multiple middleware in order', async () => {
      const order: number[] = [];
      const context = { timestamp: Date.now() };

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
      const context = { timestamp: Date.now() };

      chain.use(async () => {
        throw new NostrError(
          ErrorCode.INTERNAL_ERROR,
          'Test error'
        );
      });

      await expect(chain.execute(context)).rejects.toThrow(NostrError);
    });
  });
});