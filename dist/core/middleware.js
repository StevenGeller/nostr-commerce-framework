"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.logRequest = exports.validatePayment = exports.sanitizeContent = exports.validateEvent = exports.MiddlewareChain = void 0;
const errors_1 = require("./errors");
const logging_1 = require("./logging");
class MiddlewareChain {
    constructor() {
        this.middlewares = [];
    }
    use(middleware) {
        this.middlewares.push(middleware);
        return this;
    }
    async execute(context) {
        let index = 0;
        const next = async () => {
            if (index < this.middlewares.length) {
                const middleware = this.middlewares[index++];
                await middleware(context, next);
            }
        };
        try {
            await next();
        }
        catch (error) {
            logging_1.logger.error('Middleware chain execution failed', { error, context });
            throw error;
        }
    }
}
exports.MiddlewareChain = MiddlewareChain;
// Built-in middlewares
const validateEvent = async (context, next) => {
    if (!context.event) {
        await next();
        return;
    }
    // Basic event validation
    if (!context.event.kind || typeof context.event.kind !== 'number') {
        throw new errors_1.NostrError(errors_1.ErrorCode.INVALID_EVENT, 'Event validation failed: Invalid or missing kind', { event: context.event });
    }
    // Content length validation
    if (context.event.content && context.event.content.length > 64000) {
        throw new errors_1.NostrError(errors_1.ErrorCode.INVALID_EVENT, 'Event validation failed: Content too long', { contentLength: context.event.content.length });
    }
    // Tags validation
    if (!Array.isArray(context.event.tags)) {
        throw new errors_1.NostrError(errors_1.ErrorCode.INVALID_EVENT, 'Event validation failed: Invalid tags format', { tags: context.event.tags });
    }
    await next();
};
exports.validateEvent = validateEvent;
const sanitizeContent = async (context, next) => {
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
exports.sanitizeContent = sanitizeContent;
const validatePayment = async (context, next) => {
    const payment = context.metadata?.payment;
    if (!payment) {
        await next();
        return;
    }
    if (typeof payment.amount !== 'number' || payment.amount <= 0) {
        throw new errors_1.NostrError(errors_1.ErrorCode.INVALID_AMOUNT, 'Payment validation failed: Invalid amount', { amount: payment.amount });
    }
    if (!payment.recipient) {
        throw new errors_1.NostrError(errors_1.ErrorCode.INVALID_AMOUNT, 'Payment validation failed: No recipient specified');
    }
    await next();
};
exports.validatePayment = validatePayment;
const logRequest = async (context, next) => {
    const startTime = Date.now();
    try {
        await next();
        logging_1.logger.info('Request processed successfully', {
            duration: Date.now() - startTime,
            context
        });
    }
    catch (error) {
        logging_1.logger.error('Request processing failed', {
            duration: Date.now() - startTime,
            error,
            context
        });
        throw error;
    }
};
exports.logRequest = logRequest;
