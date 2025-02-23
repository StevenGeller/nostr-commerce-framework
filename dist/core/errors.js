"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createPaymentError = exports.createRateLimitError = exports.createAuthError = exports.createValidationError = exports.createPublishError = exports.createConnectionError = exports.NostrError = exports.ErrorCode = void 0;
var ErrorCode;
(function (ErrorCode) {
    // Connection Errors
    ErrorCode["RELAY_CONNECTION_FAILED"] = "RELAY_CONNECTION_FAILED";
    ErrorCode["CONNECTION_TIMEOUT"] = "CONNECTION_TIMEOUT";
    ErrorCode["MAX_CONNECTIONS_EXCEEDED"] = "MAX_CONNECTIONS_EXCEEDED";
    // Configuration Errors
    ErrorCode["INVALID_CONFIG"] = "INVALID_CONFIG";
    ErrorCode["MISSING_CONFIG"] = "MISSING_CONFIG";
    ErrorCode["INVALID_KEY"] = "INVALID_KEY";
    // Event Errors
    ErrorCode["EVENT_VALIDATION_FAILED"] = "EVENT_VALIDATION_FAILED";
    ErrorCode["PUBLISH_FAILED"] = "PUBLISH_FAILED";
    ErrorCode["SUBSCRIPTION_FAILED"] = "SUBSCRIPTION_FAILED";
    // Commerce Errors
    ErrorCode["INVALID_AMOUNT"] = "INVALID_AMOUNT";
    ErrorCode["INSUFFICIENT_FUNDS"] = "INSUFFICIENT_FUNDS";
    ErrorCode["PAYMENT_FAILED"] = "PAYMENT_FAILED";
    ErrorCode["INVOICE_EXPIRED"] = "INVOICE_EXPIRED";
    ErrorCode["INVOICE_NOT_FOUND"] = "INVOICE_NOT_FOUND";
    ErrorCode["PAYMENT_VERIFICATION_FAILED"] = "PAYMENT_VERIFICATION_FAILED";
    // Security Errors
    ErrorCode["UNAUTHORIZED"] = "UNAUTHORIZED";
    ErrorCode["RATE_LIMIT_EXCEEDED"] = "RATE_LIMIT_EXCEEDED";
    ErrorCode["INVALID_SIGNATURE"] = "INVALID_SIGNATURE";
    // Plugin Errors
    ErrorCode["PLUGIN_REGISTRATION_FAILED"] = "PLUGIN_REGISTRATION_FAILED";
    ErrorCode["PLUGIN_INITIALIZATION_FAILED"] = "PLUGIN_INITIALIZATION_FAILED";
    ErrorCode["PLUGIN_NOT_FOUND"] = "PLUGIN_NOT_FOUND";
    // General Errors
    ErrorCode["INTERNAL_ERROR"] = "INTERNAL_ERROR";
    ErrorCode["INVALID_PARAMETER"] = "INVALID_PARAMETER";
    ErrorCode["NOT_IMPLEMENTED"] = "NOT_IMPLEMENTED";
})(ErrorCode || (exports.ErrorCode = ErrorCode = {}));
class NostrError extends Error {
    constructor(code, message, details) {
        super(message);
        this.code = code;
        this.details = details;
        this.name = 'NostrError';
        Object.setPrototypeOf(this, NostrError.prototype);
    }
}
exports.NostrError = NostrError;
// Error factory functions for common errors
const createConnectionError = (relay, details) => new NostrError(ErrorCode.RELAY_CONNECTION_FAILED, `Failed to connect to relay: ${relay}`, details);
exports.createConnectionError = createConnectionError;
const createPublishError = (details) => new NostrError(ErrorCode.PUBLISH_FAILED, 'Failed to publish event', details);
exports.createPublishError = createPublishError;
const createValidationError = (message, details) => new NostrError(ErrorCode.EVENT_VALIDATION_FAILED, message, details);
exports.createValidationError = createValidationError;
const createAuthError = (message, details) => new NostrError(ErrorCode.UNAUTHORIZED, message, details);
exports.createAuthError = createAuthError;
const createRateLimitError = (details) => new NostrError(ErrorCode.RATE_LIMIT_EXCEEDED, 'Rate limit exceeded', details);
exports.createRateLimitError = createRateLimitError;
const createPaymentError = (message, code, details) => new NostrError(code, message, details);
exports.createPaymentError = createPaymentError;
