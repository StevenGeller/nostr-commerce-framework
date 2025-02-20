import { NostrEvent } from '../../src/core/types';

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
  id: 'test-id',
  pubkey: 'test-pubkey',
  created_at: Math.floor(Date.now() / 1000),
  kind: 1,
  tags: [],
  content: 'test content',
  sig: 'test-signature'
};

export const mockConfig = {
  relays: ['wss://test.relay'],
  publicKey: 'test-public-key',
  privateKey: 'test-private-key'
};

jest.mock('nostr-tools', () => ({
  SimplePool: jest.fn().mockImplementation(() => mockPool),
  getPublicKey: jest.fn().mockReturnValue('test-public-key'),
  getEventHash: jest.fn().mockReturnValue('test-event-hash'),
  signEvent: jest.fn().mockResolvedValue('test-signature')
}));

// Mock crypto functions
jest.mock('crypto', () => ({
  randomBytes: jest.fn().mockReturnValue(Buffer.from('mock-random-bytes')),
  createCipheriv: jest.fn().mockReturnValue({
    update: jest.fn().mockReturnValue(Buffer.from('mock-encrypted')),
    final: jest.fn().mockReturnValue(Buffer.from('')),
    getAuthTag: jest.fn().mockReturnValue(Buffer.from('mock-auth-tag'))
  }),
  createDecipheriv: jest.fn().mockReturnValue({
    update: jest.fn().mockReturnValue(Buffer.from('mock-decrypted')),
    final: jest.fn().mockReturnValue(Buffer.from('')),
    setAuthTag: jest.fn()
  }),
  scrypt: jest.fn((password, salt, keylen, options, callback) => {
    callback(null, Buffer.from('mock-derived-key'));
  })
}));