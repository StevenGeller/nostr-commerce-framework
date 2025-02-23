"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.PerformanceMonitor = exports.logger = void 0;
exports.requestLogger = requestLogger;
const winston_1 = __importDefault(require("winston"));
const errors_1 = require("./errors");
const { combine, timestamp, printf, colorize } = winston_1.default.format;
// Custom log levels
const levels = {
    error: 0,
    warn: 1,
    info: 2,
    debug: 3,
    trace: 4
};
// Custom colors for each level
const colors = {
    error: 'red',
    warn: 'yellow',
    info: 'green',
    debug: 'blue',
    trace: 'gray'
};
// Add colors to Winston
winston_1.default.addColors(colors);
// Custom format for logs
const logFormat = printf(({ level, message, timestamp, ...metadata }) => {
    let msg = `${timestamp} [${level}]: ${message}`;
    if (metadata.error instanceof errors_1.NostrError) {
        const { code, details } = metadata.error;
        msg += `\n  Error Code: ${code}`;
        if (details) {
            msg += `\n  Details: ${JSON.stringify(details, null, 2)}`;
        }
    }
    if (Object.keys(metadata).length > 0) {
        msg += `\n  ${JSON.stringify(metadata, null, 2)}`;
    }
    return msg;
});
// Create the logger
exports.logger = winston_1.default.createLogger({
    levels,
    level: process.env.LOG_LEVEL || 'info',
    format: combine(timestamp(), logFormat),
    transports: [
        // Console transport with colors
        new winston_1.default.transports.Console({
            format: combine(colorize({ all: true }), logFormat)
        }),
        // File transport for errors
        new winston_1.default.transports.File({
            filename: 'error.log',
            level: 'error'
        }),
        // File transport for all logs
        new winston_1.default.transports.File({
            filename: 'combined.log'
        })
    ]
});
// Add request logging middleware
function requestLogger(enabled = true) {
    return (req, res, next) => {
        if (!enabled)
            return next();
        const start = Date.now();
        const requestId = Math.random().toString(36).substring(7);
        // Log request
        exports.logger.info('Incoming request', {
            requestId,
            method: req.method,
            url: req.url,
            headers: req.headers,
            body: req.body
        });
        // Log response
        res.on('finish', () => {
            const duration = Date.now() - start;
            exports.logger.info('Request completed', {
                requestId,
                statusCode: res.statusCode,
                duration: `${duration}ms`
            });
        });
        next();
    };
}
// Performance monitoring
class PerformanceMonitor {
    static startTimer(label) {
        this.timers.set(label, Date.now());
    }
    static endTimer(label) {
        const start = this.timers.get(label);
        if (!start) {
            throw new Error(`No timer found for label: ${label}`);
        }
        const duration = Date.now() - start;
        this.timers.delete(label);
        exports.logger.debug('Performance measurement', {
            label,
            duration: `${duration}ms`
        });
        return duration;
    }
    static async measure(label, fn) {
        this.startTimer(label);
        try {
            const result = await fn();
            this.endTimer(label);
            return result;
        }
        catch (error) {
            this.endTimer(label);
            throw error;
        }
    }
}
exports.PerformanceMonitor = PerformanceMonitor;
PerformanceMonitor.timers = new Map();
