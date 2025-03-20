export declare enum ErrorCode {
    CONNECTION_FAILED = "CONNECTION_FAILED",
    NOT_CONNECTED = "NOT_CONNECTED",
    RELAY_CONNECTION_FAILED = "RELAY_CONNECTION_FAILED",
    CONNECTION_TIMEOUT = "CONNECTION_TIMEOUT",
    MAX_CONNECTIONS_EXCEEDED = "MAX_CONNECTIONS_EXCEEDED",
    PAYMENT_FAILED = "PAYMENT_FAILED",
    INVOICE_CREATION_FAILED = "INVOICE_CREATION_FAILED",
    INVOICE_NOT_FOUND = "INVOICE_NOT_FOUND",
    PAYMENT_VERIFICATION_FAILED = "PAYMENT_VERIFICATION_FAILED",
    INSUFFICIENT_FUNDS = "INSUFFICIENT_FUNDS",
    INVALID_PARAMETER = "INVALID_PARAMETER",
    INVALID_AMOUNT = "INVALID_AMOUNT",
    INVALID_EVENT = "INVALID_EVENT",
    EVENT_VALIDATION_FAILED = "EVENT_VALIDATION_FAILED",
    NOT_FOUND = "NOT_FOUND",
    ALREADY_EXISTS = "ALREADY_EXISTS",
    RESOURCE_UNAVAILABLE = "RESOURCE_UNAVAILABLE",
    UNAUTHORIZED = "UNAUTHORIZED",
    FORBIDDEN = "FORBIDDEN",
    RATE_LIMIT_EXCEEDED = "RATE_LIMIT_EXCEEDED",
    INVALID_SIGNATURE = "INVALID_SIGNATURE",
    INTERNAL_ERROR = "INTERNAL_ERROR",
    NOT_IMPLEMENTED = "NOT_IMPLEMENTED",
    SERVICE_UNAVAILABLE = "SERVICE_UNAVAILABLE"
}
export declare class NostrError extends Error {
    code: ErrorCode;
    details?: any;
    constructor(code: ErrorCode, message: string, details?: any);
    toJSON(): {
        code: ErrorCode;
        message: string;
        details: any;
    };
}
