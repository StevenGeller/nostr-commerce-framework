"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.RateLimiter = exports.eventValidator = exports.Validator = void 0;
exports.sanitizeContent = sanitizeContent;
exports.validatePaymentAmount = validatePaymentAmount;
const errors_1 = require("./errors");
const logging_1 = require("./logging");
class Validator {
    constructor() {
        this.rules = [];
    }
    addRule(rule) {
        this.rules.push(rule);
        return this;
    }
    validate(value) {
        for (const rule of this.rules) {
            if (!rule.validate(value)) {
                throw new errors_1.NostrError(errors_1.ErrorCode.EVENT_VALIDATION_FAILED, rule.message, { value });
            }
        }
    }
}
exports.Validator = Validator;
// Event validation rules
exports.eventValidator = new Validator();
// Add basic validation rules
exports.eventValidator
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
        if (!event.content)
            return true; // Content can be empty
        return typeof event.content === 'string' && event.content.length <= 64000;
    },
    message: 'Event content must be a string of maximum 64000 characters'
});
// Content sanitization
function sanitizeContent(content) {
    if (!content)
        return '';
    // Remove any potential XSS vectors
    content = content
        .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
        .replace(/<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi, '');
    // Remove null bytes and other control characters
    content = content.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '');
    return content.trim();
}
// Payment amount validation
function validatePaymentAmount(amount) {
    if (typeof amount !== 'number' || isNaN(amount)) {
        throw new errors_1.NostrError(errors_1.ErrorCode.INVALID_AMOUNT, 'Payment amount must be a valid number', { amount });
    }
    if (amount <= 0) {
        throw new errors_1.NostrError(errors_1.ErrorCode.INVALID_AMOUNT, 'Payment amount must be greater than 0', { amount });
    }
    if (!Number.isInteger(amount)) {
        throw new errors_1.NostrError(errors_1.ErrorCode.INVALID_AMOUNT, 'Payment amount must be an integer', { amount });
    }
}
// Rate limiting
class RateLimiter {
    constructor(windowMs = 60000, maxRequests = 100) {
        this.requests = new Map();
        this.windowMs = windowMs;
        this.maxRequests = maxRequests;
    }
    checkLimit(key) {
        const now = Date.now();
        const windowStart = now - this.windowMs;
        // Get existing requests or create new array
        let requests = this.requests.get(key) || [];
        // Remove old requests outside the window
        requests = requests.filter(timestamp => timestamp > windowStart);
        // Check if limit is exceeded
        if (requests.length >= this.maxRequests) {
            throw new errors_1.NostrError(errors_1.ErrorCode.RATE_LIMIT_EXCEEDED, 'Rate limit exceeded', {
                key,
                windowMs: this.windowMs,
                maxRequests: this.maxRequests,
                currentRequests: requests.length
            });
        }
        // Add new request
        requests.push(now);
        this.requests.set(key, requests);
        logging_1.logger.debug('Rate limit check passed', {
            key,
            requestCount: requests.length,
            maxRequests: this.maxRequests
        });
    }
    // Clean up old entries periodically
    cleanup() {
        const now = Date.now();
        const windowStart = now - this.windowMs;
        for (const [key, requests] of this.requests.entries()) {
            const validRequests = requests.filter(timestamp => timestamp > windowStart);
            if (validRequests.length === 0) {
                this.requests.delete(key);
            }
            else {
                this.requests.set(key, validRequests);
            }
        }
        logging_1.logger.debug('Rate limiter cleanup completed');
    }
}
exports.RateLimiter = RateLimiter;
