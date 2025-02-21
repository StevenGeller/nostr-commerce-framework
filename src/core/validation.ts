import { NostrError, ErrorCode } from './errors';
import { NostrEvent } from './types';
import { logger } from './logging';

export interface ValidationRule<T> {
  validate: (value: T) => boolean;
  message: string;
}

export class Validator<T> {
  private rules: ValidationRule<T>[] = [];

  addRule(rule: ValidationRule<T>): this {
    this.rules.push(rule);
    return this;
  }

  validate(value: T): void {
    for (const rule of this.rules) {
      if (!rule.validate(value)) {
        throw new NostrError(
          ErrorCode.EVENT_VALIDATION_FAILED,
          rule.message,
          { value }
        );
      }
    }
  }
}

// Event validation rules
export const eventValidator = new Validator<Partial<NostrEvent>>();

// Add basic validation rules
eventValidator
  .addRule({
    validate: (event) => typeof event.kind === 'number',
    message: 'Event kind must be a number'
  })
  .addRule({
    validate: (event) => Array.isArray(event.tags),
    message: 'Event tags must be an array'
  })
  .addRule({
    validate: (event) => {
      if (!event.content) return true; // Content can be empty
      return typeof event.content === 'string' && event.content.length <= 64000;
    },
    message: 'Event content must be a string of maximum 64000 characters'
  });

// Content sanitization
export function sanitizeContent(content: string | undefined): string {
  if (!content) return '';
  
  // Remove any potential XSS vectors
  content = content
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi, '');
  
  // Remove null bytes and other control characters
  content = content.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '');
  
  return content.trim();
}

// Payment amount validation
export function validatePaymentAmount(amount: number): void {
  if (typeof amount !== 'number' || isNaN(amount)) {
    throw new NostrError(
      ErrorCode.INVALID_AMOUNT,
      'Payment amount must be a valid number',
      { amount }
    );
  }

  if (amount <= 0) {
    throw new NostrError(
      ErrorCode.INVALID_AMOUNT,
      'Payment amount must be greater than 0',
      { amount }
    );
  }

  if (!Number.isInteger(amount)) {
    throw new NostrError(
      ErrorCode.INVALID_AMOUNT,
      'Payment amount must be an integer',
      { amount }
    );
  }
}

// Rate limiting
export class RateLimiter {
  private requests: Map<string, number[]> = new Map();
  private readonly windowMs: number;
  private readonly maxRequests: number;

  constructor(windowMs: number = 60000, maxRequests: number = 100) {
    this.windowMs = windowMs;
    this.maxRequests = maxRequests;
  }

  checkLimit(key: string): void {
    const now = Date.now();
    const windowStart = now - this.windowMs;

    // Get existing requests or create new array
    let requests = this.requests.get(key) || [];
    
    // Remove old requests outside the window
    requests = requests.filter(timestamp => timestamp > windowStart);

    // Check if limit is exceeded
    if (requests.length >= this.maxRequests) {
      throw new NostrError(
        ErrorCode.RATE_LIMIT_EXCEEDED,
        'Rate limit exceeded',
        {
          key,
          windowMs: this.windowMs,
          maxRequests: this.maxRequests,
          currentRequests: requests.length
        }
      );
    }

    // Add new request
    requests.push(now);
    this.requests.set(key, requests);

    logger.debug('Rate limit check passed', {
      key,
      requestCount: requests.length,
      maxRequests: this.maxRequests
    });
  }

  // Clean up old entries periodically
  cleanup(): void {
    const now = Date.now();
    const windowStart = now - this.windowMs;

    for (const [key, requests] of this.requests.entries()) {
      const validRequests = requests.filter(timestamp => timestamp > windowStart);
      if (validRequests.length === 0) {
        this.requests.delete(key);
      } else {
        this.requests.set(key, validRequests);
      }
    }

    logger.debug('Rate limiter cleanup completed');
  }
}