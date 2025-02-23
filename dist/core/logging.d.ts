export declare const logger: any;
export declare function requestLogger(enabled?: boolean): (req: any, res: any, next: () => void) => void;
export declare class PerformanceMonitor {
    private static timers;
    static startTimer(label: string): void;
    static endTimer(label: string): number;
    static measure<T>(label: string, fn: () => Promise<T>): Promise<T>;
}
