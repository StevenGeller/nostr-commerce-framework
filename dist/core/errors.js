"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.NostrError = exports.ErrorCode = void 0;
var ErrorCode;
(function (ErrorCode) {
    // Connection Errors
    ErrorCode["CONNECTION_FAILED"] = "CONNECTION_FAILED";
    ErrorCode["NOT_CONNECTED"] = "NOT_CONNECTED";
    ErrorCode["RELAY_CONNECTION_FAILED"] = "RELAY_CONNECTION_FAILED";
    ErrorCode["CONNECTION_TIMEOUT"] = "CONNECTION_TIMEOUT";
    ErrorCode["MAX_CONNECTIONS_EXCEEDED"] = "MAX_CONNECTIONS_EXCEEDED";
    // Payment Errors
    ErrorCode["PAYMENT_FAILED"] = "PAYMENT_FAILED";
    ErrorCode["INVOICE_CREATION_FAILED"] = "INVOICE_CREATION_FAILED";
    ErrorCode["INVOICE_NOT_FOUND"] = "INVOICE_NOT_FOUND";
    ErrorCode["PAYMENT_VERIFICATION_FAILED"] = "PAYMENT_VERIFICATION_FAILED";
    ErrorCode["INSUFFICIENT_FUNDS"] = "INSUFFICIENT_FUNDS";
    // Validation Errors
    ErrorCode["INVALID_PARAMETER"] = "INVALID_PARAMETER";
    ErrorCode["INVALID_AMOUNT"] = "INVALID_AMOUNT";
    ErrorCode["INVALID_EVENT"] = "INVALID_EVENT";
    ErrorCode["EVENT_VALIDATION_FAILED"] = "EVENT_VALIDATION_FAILED";
    // Resource Errors
    ErrorCode["NOT_FOUND"] = "NOT_FOUND";
    ErrorCode["ALREADY_EXISTS"] = "ALREADY_EXISTS";
    ErrorCode["RESOURCE_UNAVAILABLE"] = "RESOURCE_UNAVAILABLE";
    // Security Errors
    ErrorCode["UNAUTHORIZED"] = "UNAUTHORIZED";
    ErrorCode["FORBIDDEN"] = "FORBIDDEN";
    ErrorCode["RATE_LIMIT_EXCEEDED"] = "RATE_LIMIT_EXCEEDED";
    ErrorCode["INVALID_SIGNATURE"] = "INVALID_SIGNATURE";
    // System Errors
    ErrorCode["INTERNAL_ERROR"] = "INTERNAL_ERROR";
    ErrorCode["NOT_IMPLEMENTED"] = "NOT_IMPLEMENTED";
    ErrorCode["SERVICE_UNAVAILABLE"] = "SERVICE_UNAVAILABLE";
})(ErrorCode || (exports.ErrorCode = ErrorCode = {}));
class NostrError extends Error {
    constructor(code, message, details) {
        super(message);
        this.code = code;
        this.details = details;
        this.name = 'NostrError';
        Object.setPrototypeOf(this, NostrError.prototype);
    }
    toJSON() {
        return {
            code: this.code,
            message: this.message,
            details: this.details
        };
    }
}
exports.NostrError = NostrError;
