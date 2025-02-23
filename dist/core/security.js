"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.KeyManager = void 0;
const crypto_1 = require("crypto");
const util_1 = require("util");
const errors_1 = require("./errors");
const scryptAsync = (0, util_1.promisify)(crypto_1.scrypt);
class KeyManager {
    /**
     * Encrypt sensitive data (like private keys)
     */
    static async encrypt(data, password) {
        try {
            const salt = (0, crypto_1.randomBytes)(16);
            const iv = (0, crypto_1.randomBytes)(12);
            const key = await scryptAsync(password, salt, this.KEY_LENGTH);
            const cipher = (0, crypto_1.createCipheriv)(this.ENCRYPTION_ALGORITHM, key, iv);
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
        }
        catch (error) {
            throw new errors_1.NostrError(errors_1.ErrorCode.ENCRYPTION_FAILED, 'Failed to encrypt data', { error: error instanceof Error ? error.message : 'Unknown error' });
        }
    }
    /**
     * Decrypt sensitive data
     */
    static async decrypt(encryptedData, password) {
        try {
            const salt = Buffer.from(encryptedData.salt, 'base64');
            const iv = Buffer.from(encryptedData.iv, 'base64');
            const encrypted = Buffer.from(encryptedData.encrypted, 'base64');
            const key = await scryptAsync(password, salt, this.KEY_LENGTH);
            const authTag = encrypted.slice(-16);
            const data = encrypted.slice(0, -16);
            const decipher = (0, crypto_1.createDecipheriv)(this.ENCRYPTION_ALGORITHM, key, iv);
            decipher.setAuthTag(authTag);
            const decrypted = Buffer.concat([
                decipher.update(data),
                decipher.final()
            ]);
            return decrypted.toString('utf8');
        }
        catch (error) {
            throw new errors_1.NostrError(errors_1.ErrorCode.DECRYPTION_FAILED, 'Failed to decrypt data', { error: error instanceof Error ? error.message : 'Unknown error' });
        }
    }
    /**
     * Generate a random encryption key
     */
    static generateEncryptionKey() {
        return (0, crypto_1.randomBytes)(32).toString('base64');
    }
    /**
     * Validate private key format
     */
    static validatePrivateKey(key) {
        // Add specific validation logic for your private key format
        const hexRegex = /^[0-9a-fA-F]{64}$/;
        return hexRegex.test(key);
    }
    /**
     * Store a key securely in memory
     */
    static storeKey(id, key) {
        this.keyStore.set(id, key);
    }
    /**
     * Retrieve a stored key
     */
    static getKey(id) {
        return this.keyStore.get(id);
    }
    /**
     * Remove a stored key
     */
    static removeKey(id) {
        this.keyStore.delete(id);
    }
    /**
     * Clear all stored keys
     */
    static clearKeys() {
        this.keyStore.clear();
    }
}
exports.KeyManager = KeyManager;
KeyManager.ENCRYPTION_ALGORITHM = 'aes-256-gcm';
KeyManager.KEY_LENGTH = 32;
KeyManager.keyStore = new Map();
