import { NostrEvent } from './types';
export interface ValidationRule<T> {
    validate: (value: T) => boolean;
    message: string;
}
export declare class Validator<T> {
    private rules;
    addRule(rule: ValidationRule<T>): this;
    validate(value: T): void;
}
export declare const eventValidator: Validator<Partial<NostrEvent>>;
export declare function sanitizeContent(content: string | undefined): string;
export declare function validatePaymentAmount(amount: number): void;
export declare class RateLimiter {
    private requests;
    private readonly windowMs;
    private readonly maxRequests;
    constructor(windowMs?: number, maxRequests?: number);
    checkLimit(key: string): void;
    cleanup(): void;
}
