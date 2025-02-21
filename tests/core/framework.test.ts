import { NostrError, ErrorCode } from '../../src/core/errors';
import { KeyManager } from '../../src/core/security';
import { eventValidator, RateLimiter } from '../../src/core/validation';
import { mockEvent } from '../mocks/nostr-tools';

describe('Core Framework Tests', () => {
  describe('Error Handling', () => {
    it('should create NostrError with correct properties', () => {
      const error = new NostrError(
        ErrorCode.RELAY_CONNECTION_FAILED,
        'Failed to connect',
        { relay: 'wss://test.relay' }
      );

      expect(error.code).toBe(ErrorCode.RELAY_CONNECTION_FAILED);
      expect(error.message).toBe('Failed to connect');
      expect(error.details).toEqual({ relay: 'wss://test.relay' });
      expect(error.timestamp).toBeDefined();
    });

    it('should serialize and deserialize NostrError', () => {
      const originalError = new NostrError(
        ErrorCode.INVALID_EVENT,
        'Invalid event data'
      );

      const serialized = originalError.toJSON();
      const deserialized = NostrError.fromJSON(serialized);

      expect(deserialized.code).toBe(originalError.code);
      expect(deserialized.message).toBe(originalError.message);
      expect(typeof deserialized.timestamp).toBe('number');
    });
  });

  describe('Event Validation', () => {
    it('should validate valid events', () => {
      expect(() => eventValidator.validate(mockEvent)).not.toThrow();
    });

    it('should reject invalid events', () => {
      const invalidEvent = { ...mockEvent, kind: undefined };
      expect(() => eventValidator.validate(invalidEvent))
        .toThrow(NostrError);
    });

    it('should validate event content length', () => {
      const longContent = 'a'.repeat(65000);
      const invalidEvent = { ...mockEvent, content: longContent };
      
      expect(() => eventValidator.validate(invalidEvent))
        .toThrow(NostrError);
    });
  });

  describe('Rate Limiting', () => {
    let rateLimiter: RateLimiter;

    beforeEach(() => {
      rateLimiter = new RateLimiter(1000, 2); // 2 requests per second
    });

    it('should allow requests within limit', () => {
      expect(() => rateLimiter.checkLimit('test-user')).not.toThrow();
      expect(() => rateLimiter.checkLimit('test-user')).not.toThrow();
    });

    it('should block requests exceeding limit', () => {
      rateLimiter.checkLimit('test-user');
      rateLimiter.checkLimit('test-user');
      
      expect(() => rateLimiter.checkLimit('test-user'))
        .toThrow(NostrError);
    });

    it('should reset limits after window expires', async () => {
      rateLimiter.checkLimit('test-user');
      rateLimiter.checkLimit('test-user');
      
      await new Promise(resolve => setTimeout(resolve, 1100));
      
      expect(() => rateLimiter.checkLimit('test-user')).not.toThrow();
    });
  });

  describe('Key Management', () => {
    const testData = 'sensitive-data';
    const testPassword = 'test-password';

    it('should encrypt and decrypt data', async () => {
      const encrypted = await KeyManager.encrypt(testData, testPassword);
      expect(encrypted.encrypted).toBeDefined();
      expect(encrypted.iv).toBeDefined();
      expect(encrypted.salt).toBeDefined();

      const decrypted = await KeyManager.decrypt(encrypted, testPassword);
      expect(decrypted).toBe(testData);
    });

    it('should fail decryption with wrong password', async () => {
      const encrypted = await KeyManager.encrypt(testData, testPassword);
      
      await expect(KeyManager.decrypt(encrypted, 'wrong-password'))
        .rejects
        .toThrow(NostrError);
    });

    it('should validate private keys', () => {
      const validKey = '1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef';
      const invalidKey = 'invalid-key';

      expect(KeyManager.validatePrivateKey(validKey)).toBe(true);
      expect(KeyManager.validatePrivateKey(invalidKey)).toBe(false);
    });

    it('should securely store and retrieve keys', () => {
      const keyId = 'test-key';
      const keyData = 'secure-key-data';

      KeyManager.storeKey(keyId, keyData);
      expect(KeyManager.getKey(keyId)).toBe(keyData);

      KeyManager.removeKey(keyId);
      expect(KeyManager.getKey(keyId)).toBeUndefined();
    });
  });
});