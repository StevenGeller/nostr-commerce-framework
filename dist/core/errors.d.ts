export declare enum ErrorCode {
    RELAY_CONNECTION_FAILED = "RELAY_CONNECTION_FAILED",
    CONNECTION_TIMEOUT = "CONNECTION_TIMEOUT",
    MAX_CONNECTIONS_EXCEEDED = "MAX_CONNECTIONS_EXCEEDED",
    INVALID_CONFIG = "INVALID_CONFIG",
    MISSING_CONFIG = "MISSING_CONFIG",
    INVALID_KEY = "INVALID_KEY",
    EVENT_VALIDATION_FAILED = "EVENT_VALIDATION_FAILED",
    PUBLISH_FAILED = "PUBLISH_FAILED",
    SUBSCRIPTION_FAILED = "SUBSCRIPTION_FAILED",
    INVALID_AMOUNT = "INVALID_AMOUNT",
    INSUFFICIENT_FUNDS = "INSUFFICIENT_FUNDS",
    PAYMENT_FAILED = "PAYMENT_FAILED",
    INVOICE_EXPIRED = "INVOICE_EXPIRED",
    INVOICE_NOT_FOUND = "INVOICE_NOT_FOUND",
    PAYMENT_VERIFICATION_FAILED = "PAYMENT_VERIFICATION_FAILED",
    UNAUTHORIZED = "UNAUTHORIZED",
    RATE_LIMIT_EXCEEDED = "RATE_LIMIT_EXCEEDED",
    INVALID_SIGNATURE = "INVALID_SIGNATURE",
    PLUGIN_REGISTRATION_FAILED = "PLUGIN_REGISTRATION_FAILED",
    PLUGIN_INITIALIZATION_FAILED = "PLUGIN_INITIALIZATION_FAILED",
    PLUGIN_NOT_FOUND = "PLUGIN_NOT_FOUND",
    INTERNAL_ERROR = "INTERNAL_ERROR",
    INVALID_PARAMETER = "INVALID_PARAMETER",
    NOT_IMPLEMENTED = "NOT_IMPLEMENTED"
}
export declare class NostrError extends Error {
    code: ErrorCode;
    details?: any | undefined;
    constructor(code: ErrorCode, message: string, details?: any | undefined);
}
export declare const createConnectionError: (relay: string, details?: any) => NostrError;
export declare const createPublishError: (details?: any) => NostrError;
export declare const createValidationError: (message: string, details?: any) => NostrError;
export declare const createAuthError: (message: string, details?: any) => NostrError;
export declare const createRateLimitError: (details?: any) => NostrError;
export declare const createPaymentError: (message: string, code: ErrorCode, details?: any) => NostrError;
