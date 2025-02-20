export enum ErrorCode {
  // Connection Errors
  RELAY_CONNECTION_FAILED = 'RELAY_CONNECTION_FAILED',
  RELAY_DISCONNECTED = 'RELAY_DISCONNECTED',
  RELAY_TIMEOUT = 'RELAY_TIMEOUT',

  // Event Errors
  INVALID_EVENT = 'INVALID_EVENT',
  EVENT_PUBLISH_FAILED = 'EVENT_PUBLISH_FAILED',
  EVENT_VALIDATION_FAILED = 'EVENT_VALIDATION_FAILED',

  // Security Errors
  INVALID_KEY = 'INVALID_KEY',
  ENCRYPTION_FAILED = 'ENCRYPTION_FAILED',
  DECRYPTION_FAILED = 'DECRYPTION_FAILED',
  UNAUTHORIZED = 'UNAUTHORIZED',

  // Payment Errors
  PAYMENT_FAILED = 'PAYMENT_FAILED',
  INVALID_AMOUNT = 'INVALID_AMOUNT',
  INSUFFICIENT_FUNDS = 'INSUFFICIENT_FUNDS',
  INVOICE_NOT_FOUND = 'INVOICE_NOT_FOUND',

  // Plugin Errors
  PLUGIN_INITIALIZATION_FAILED = 'PLUGIN_INITIALIZATION_FAILED',
  PLUGIN_NOT_FOUND = 'PLUGIN_NOT_FOUND',
  PLUGIN_ALREADY_REGISTERED = 'PLUGIN_ALREADY_REGISTERED',

  // General Errors
  INTERNAL_ERROR = 'INTERNAL_ERROR',
  INVALID_CONFIGURATION = 'INVALID_CONFIGURATION',
  RATE_LIMIT_EXCEEDED = 'RATE_LIMIT_EXCEEDED'
}

export interface ErrorDetails {
  code: ErrorCode;
  message: string;
  timestamp: number;
  details?: Record<string, any>;
  stack?: string;
}

export class NostrError extends Error {
  public readonly code: ErrorCode;
  public readonly timestamp: number;
  public readonly details?: Record<string, any>;

  constructor(code: ErrorCode, message: string, details?: Record<string, any>) {
    super(message);
    this.code = code;
    this.timestamp = Date.now();
    this.details = details;
    this.name = 'NostrError';

    // Ensure proper stack trace
    Error.captureStackTrace(this, this.constructor);
  }

  public toJSON(): ErrorDetails {
    return {
      code: this.code,
      message: this.message,
      timestamp: this.timestamp,
      details: this.details,
      stack: this.stack
    };
  }

  public static fromJSON(error: ErrorDetails): NostrError {
    const nostrError = new NostrError(error.code, error.message, error.details);
    nostrError.stack = error.stack;
    return nostrError;
  }
}