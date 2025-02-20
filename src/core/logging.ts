import winston from 'winston';
import { NostrError } from './errors';

const { combine, timestamp, printf, colorize } = winston.format;

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
winston.addColors(colors);

// Custom format for logs
const logFormat = printf(({ level, message, timestamp, ...metadata }) => {
  let msg = `${timestamp} [${level}]: ${message}`;
  
  if (metadata.error instanceof NostrError) {
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
export const logger = winston.createLogger({
  levels,
  level: process.env.LOG_LEVEL || 'info',
  format: combine(
    timestamp(),
    logFormat
  ),
  transports: [
    // Console transport with colors
    new winston.transports.Console({
      format: combine(
        colorize({ all: true }),
        logFormat
      )
    }),
    // File transport for errors
    new winston.transports.File({
      filename: 'error.log',
      level: 'error'
    }),
    // File transport for all logs
    new winston.transports.File({
      filename: 'combined.log'
    })
  ]
});

// Add request logging middleware
export function requestLogger(enabled = true) {
  return (req: any, res: any, next: () => void) => {
    if (!enabled) return next();

    const start = Date.now();
    const requestId = Math.random().toString(36).substring(7);

    // Log request
    logger.info('Incoming request', {
      requestId,
      method: req.method,
      url: req.url,
      headers: req.headers,
      body: req.body
    });

    // Log response
    res.on('finish', () => {
      const duration = Date.now() - start;
      logger.info('Request completed', {
        requestId,
        statusCode: res.statusCode,
        duration: `${duration}ms`
      });
    });

    next();
  };
}

// Performance monitoring
export class PerformanceMonitor {
  private static timers = new Map<string, number>();

  static startTimer(label: string): void {
    this.timers.set(label, Date.now());
  }

  static endTimer(label: string): number {
    const start = this.timers.get(label);
    if (!start) {
      throw new Error(`No timer found for label: ${label}`);
    }

    const duration = Date.now() - start;
    this.timers.delete(label);

    logger.debug('Performance measurement', {
      label,
      duration: `${duration}ms`
    });

    return duration;
  }

  static async measure<T>(
    label: string,
    fn: () => Promise<T>
  ): Promise<T> {
    this.startTimer(label);
    try {
      const result = await fn();
      this.endTimer(label);
      return result;
    } catch (error) {
      this.endTimer(label);
      throw error;
    }
  }
}