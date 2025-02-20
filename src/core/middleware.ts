import { NostrError, ErrorCode } from './errors';
import { NostrEvent } from './types';
import { logger } from './logging';
import { RateLimiter } from './validation';

export interface MiddlewareContext {
  event?: NostrEvent;
  userId?: string;
  timestamp: number;
  metadata?: Record<string, any>;
}

export type NextFunction = () => Promise<void>;
export type Middleware = (context: MiddlewareContext, next: NextFunction) => Promise<void>;

export class MiddlewareChain {
  private middlewares: Middleware[] = [];
  private rateLimiter = new RateLimiter();

  use(middleware: Middleware): this {
    this.middlewares.push(middleware);
    return this;
  }

  async execute(context: MiddlewareContext): Promise<void> {
    let index = 0;

    const next: NextFunction = async () => {
      if (index < this.middlewares.length) {
        const middleware = this.middlewares[index++];
        await middleware(context, next);
      }
    };

    try {
      await next();
    } catch (error) {
      logger.error('Middleware chain execution failed', { error, context });
      throw error;
    }
  }
}

// Built-in middlewares
export const rateLimit: Middleware = async (context, next) => {
  if (!context.userId) {
    throw new NostrError(
      ErrorCode.UNAUTHORIZED,
      'User ID required for rate limiting'
    );
  }

  const rateLimiter = new RateLimiter();
  rateLimiter.checkLimit(context.userId);
  await next();
};

export const validateEvent: Middleware = async (context, next) => {
  if (!context.event) {
    throw new NostrError(
      ErrorCode.INVALID_EVENT,
      'Event validation failed: No event provided'
    );
  }

  // Basic event validation
  if (!context.event.kind || !context.event.pubkey) {
    throw new NostrError(
      ErrorCode.INVALID_EVENT,
      'Event validation failed: Missing required fields',
      { event: context.event }
    );
  }

  // Content length validation
  if (context.event.content && context.event.content.length > 64000) {
    throw new NostrError(
      ErrorCode.INVALID_EVENT,
      'Event validation failed: Content too long',
      { contentLength: context.event.content.length }
    );
  }

  // Tags validation
  if (!Array.isArray(context.event.tags)) {
    throw new NostrError(
      ErrorCode.INVALID_EVENT,
      'Event validation failed: Invalid tags format',
      { tags: context.event.tags }
    );
  }

  await next();
};

export const sanitizeContent: Middleware = async (context, next) => {
  if (context.event?.content) {
    // Remove potential XSS vectors
    context.event.content = context.event.content
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
      .replace(/<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi, '')
      // Remove null bytes and control characters
      .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '')
      .trim();
  }
  
  await next();
};

export const validatePayment: Middleware = async (context, next) => {
  const payment = context.metadata?.payment;
  if (!payment) {
    throw new NostrError(
      ErrorCode.INVALID_AMOUNT,
      'Payment validation failed: No payment data provided'
    );
  }

  if (typeof payment.amount !== 'number' || payment.amount <= 0) {
    throw new NostrError(
      ErrorCode.INVALID_AMOUNT,
      'Payment validation failed: Invalid amount',
      { amount: payment.amount }
    );
  }

  if (!payment.recipient) {
    throw new NostrError(
      ErrorCode.INVALID_AMOUNT,
      'Payment validation failed: No recipient specified'
    );
  }

  await next();
};

export const logRequest: Middleware = async (context, next) => {
  const startTime = Date.now();
  
  try {
    await next();
    
    logger.info('Request processed successfully', {
      duration: Date.now() - startTime,
      context
    });
  } catch (error) {
    logger.error('Request processing failed', {
      duration: Date.now() - startTime,
      error,
      context
    });
    throw error;
  }
};