import { createCipheriv, createDecipheriv, randomBytes, scrypt } from 'crypto';
import { promisify } from 'util';
import { NostrError, ErrorCode } from './errors';

const scryptAsync = promisify(scrypt);

export interface EncryptedData {
  encrypted: string;
  iv: string;
  salt: string;
}

export class KeyManager {
  private static readonly ENCRYPTION_ALGORITHM = 'aes-256-gcm';
  private static readonly KEY_LENGTH = 32;
  private static readonly keyStore = new Map<string, string>();

  /**
   * Encrypt sensitive data (like private keys)
   */
  static async encrypt(
    data: string,
    password: string
  ): Promise<EncryptedData> {
    try {
      const salt = randomBytes(16);
      const iv = randomBytes(12);

      const key = await scryptAsync(password, salt, this.KEY_LENGTH) as Buffer;
      const cipher = createCipheriv(this.ENCRYPTION_ALGORITHM, key, iv);

      const encrypted = Buffer.concat([
        cipher.update(data, 'utf8'),
        cipher.final()
      ]);

      const authTag = cipher.getAuthTag();

      return {
        encrypted: Buffer.concat([encrypted, authTag]).toString('base64'),
        iv: iv.toString('base64'),
        salt: salt.toString('base64')
      };
    } catch (error) {
      throw new NostrError(
        ErrorCode.ENCRYPTION_FAILED,
        'Failed to encrypt data',
        { error: error instanceof Error ? error.message : 'Unknown error' }
      );
    }
  }

  /**
   * Decrypt sensitive data
   */
  static async decrypt(
    encryptedData: EncryptedData,
    password: string
  ): Promise<string> {
    try {
      const salt = Buffer.from(encryptedData.salt, 'base64');
      const iv = Buffer.from(encryptedData.iv, 'base64');
      const encrypted = Buffer.from(encryptedData.encrypted, 'base64');

      const key = await scryptAsync(password, salt, this.KEY_LENGTH) as Buffer;
      
      const authTag = encrypted.slice(-16);
      const data = encrypted.slice(0, -16);

      const decipher = createDecipheriv(this.ENCRYPTION_ALGORITHM, key, iv);
      decipher.setAuthTag(authTag);

      const decrypted = Buffer.concat([
        decipher.update(data),
        decipher.final()
      ]);

      return decrypted.toString('utf8');
    } catch (error) {
      throw new NostrError(
        ErrorCode.DECRYPTION_FAILED,
        'Failed to decrypt data',
        { error: error instanceof Error ? error.message : 'Unknown error' }
      );
    }
  }

  /**
   * Generate a random encryption key
   */
  static generateEncryptionKey(): string {
    return randomBytes(32).toString('base64');
  }

  /**
   * Validate private key format
   */
  static validatePrivateKey(key: string): boolean {
    // Add specific validation logic for your private key format
    const hexRegex = /^[0-9a-fA-F]{64}$/;
    return hexRegex.test(key);
  }

  /**
   * Store a key securely in memory
   */
  static storeKey(id: string, key: string): void {
    this.keyStore.set(id, key);
  }

  /**
   * Retrieve a stored key
   */
  static getKey(id: string): string | undefined {
    return this.keyStore.get(id);
  }

  /**
   * Remove a stored key
   */
  static removeKey(id: string): void {
    this.keyStore.delete(id);
  }

  /**
   * Clear all stored keys
   */
  static clearKeys(): void {
    this.keyStore.clear();
  }
}