import { MiddlewareContext } from './types/middleware';
export type NextFunction = () => Promise<void>;
export type Middleware = (context: MiddlewareContext, next: NextFunction) => Promise<void>;
export declare class MiddlewareChain {
    private middlewares;
    use(middleware: Middleware): this;
    execute(context: MiddlewareContext): Promise<void>;
}
export declare const validateEvent: Middleware;
export declare const sanitizeContent: Middleware;
export declare const validatePayment: Middleware;
export declare const logRequest: Middleware;
