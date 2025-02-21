import { NostrEvent } from '../../src/core/types';

const mockPrivateKey = '1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef';
const mockPublicKey = 'test-public-key';

export const mockPool = {
  publish: jest.fn().mockResolvedValue(true),
  sub: jest.fn().mockReturnValue({
    on: jest.fn(),
    unsub: jest.fn()
  }),
  close: jest.fn(),
  ensureRelay: jest.fn().mockResolvedValue(true)
};

export const mockEvent: NostrEvent = {
  id: 'test-event-hash',
  pubkey: mockPublicKey,
  created_at: Math.floor(Date.now() / 1000),
  kind: 1,
  tags: [],
  content: 'test content',
  sig: 'test-signature'
};

// Mock nostr-tools functions
const nostrTools = {
  SimplePool: jest.fn().mockImplementation(() => mockPool),
  getPublicKey: jest.fn().mockReturnValue(mockPublicKey),
  getEventHash: jest.fn().mockImplementation(() => 'test-event-hash'),
  signEvent: jest.fn().mockImplementation(() => Promise.resolve('test-signature')),
  validateEvent: jest.fn().mockReturnValue(true)
};

jest.mock('nostr-tools', () => nostrTools);