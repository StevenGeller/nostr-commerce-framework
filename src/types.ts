import { EventEmitter } from 'events';

export interface NostrEvent {
  kind: number;
  created_at: number;
  content: string;
  tags: string[][];
  pubkey: string;
  id: string;
  sig: string;
}

export { EventEmitter };