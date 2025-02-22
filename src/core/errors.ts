export enum ErrorCode {
  // Connection Errors
  RELAY_CONNECTION_FAILED = 'RELAY_CONNECTION_FAILED',
  CONNECTION_TIMEOUT = 'CONNECTION_TIMEOUT',
  MAX_CONNECTIONS_EXCEEDED = 'MAX_CONNECTIONS_EXCEEDED',

  // Configuration Errors
  INVALID_CONFIG = 'INVALID_CONFIG',
  MISSING_CONFIG = 'MISSING_CONFIG',
  INVALID_KEY = 'INVALID_KEY',

  // Event Errors
  EVENT_VALIDATION_FAILED = 'EVENT_VALIDATION_FAILED',
  PUBLISH_FAILED = 'PUBLISH_FAILED',
  SUBSCRIPTION_FAILED = 'SUBSCRIPTION_FAILED',

  // Commerce Errors
  INVALID_AMOUNT = 'INVALID_AMOUNT',
  INSUFFICIENT_FUNDS = 'INSUFFICIENT_FUNDS',
  PAYMENT_FAILED = 'PAYMENT_FAILED',
  INVOICE_EXPIRED = 'INVOICE_EXPIRED',
  INVOICE_NOT_FOUND = 'INVOICE_NOT_FOUND',
  PAYMENT_VERIFICATION_FAILED = 'PAYMENT_VERIFICATION_FAILED',

  // Security Errors
  UNAUTHORIZED = 'UNAUTHORIZED',
  RATE_LIMIT_EXCEEDED = 'RATE_LIMIT_EXCEEDED',
  INVALID_SIGNATURE = 'INVALID_SIGNATURE',

  // Plugin Errors
  PLUGIN_REGISTRATION_FAILED = 'PLUGIN_REGISTRATION_FAILED',
  PLUGIN_INITIALIZATION_FAILED = 'PLUGIN_INITIALIZATION_FAILED',
  PLUGIN_NOT_FOUND = 'PLUGIN_NOT_FOUND',

  // General Errors
  INTERNAL_ERROR = 'INTERNAL_ERROR',
  INVALID_PARAMETER = 'INVALID_PARAMETER',
  NOT_IMPLEMENTED = 'NOT_IMPLEMENTED'
}

export class NostrError extends Error {
  constructor(
    public code: ErrorCode,
    message: string,
    public details?: any
  ) {
    super(message);
    this.name = 'NostrError';
    Object.setPrototypeOf(this, NostrError.prototype);
  }
}

// Error factory functions for common errors
export const createConnectionError = (relay: string, details?: any) => 
  new NostrError(
    ErrorCode.RELAY_CONNECTION_FAILED,
    `Failed to connect to relay: ${relay}`,
    details
  );

export const createPublishError = (details?: any) =>
  new NostrError(
    ErrorCode.PUBLISH_FAILED,
    'Failed to publish event',
    details
  );

export const createValidationError = (message: string, details?: any) =>
  new NostrError(
    ErrorCode.EVENT_VALIDATION_FAILED,
    message,
    details
  );

export const createAuthError = (message: string, details?: any) =>
  new NostrError(
    ErrorCode.UNAUTHORIZED,
    message,
    details
  );

export const createRateLimitError = (details?: any) =>
  new NostrError(
    ErrorCode.RATE_LIMIT_EXCEEDED,
    'Rate limit exceeded',
    details
  );

export const createPaymentError = (message: string, code: ErrorCode, details?: any) =>
  new NostrError(code, message, details);