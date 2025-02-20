export interface NostrConfig {
  relays: string[];
  publicKey: string;
  privateKey: string;
}

export interface NostrEvent {
  id: string;
  pubkey: string;
  created_at: number;
  kind: number;
  tags: string[][];
  content: string;
  sig: string;
}

export interface Plugin {
  onRegister?: (framework: any) => void;
  onInitialize?: () => void | Promise<void>;
  onStop?: () => void | Promise<void>;
}

export interface InteractionModule {
  sendMessage: (content: string, recipient: string) => Promise<string>;
  subscribe: (callback: (event: NostrEvent) => void) => () => void;
}

export interface CommerceModule {
  createInvoice: (amount: number, description: string) => Promise<string>;
  processTip: (recipient: string, amount: number) => Promise<string>;
  verifyPayment: (invoiceId: string) => Promise<boolean>;
}