import { NostrEvent } from '../types';

export interface MiddlewareContext {
  event?: NostrEvent;
  metadata?: Record<string, any>;
}