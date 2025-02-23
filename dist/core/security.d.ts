export interface EncryptedData {
    encrypted: string;
    iv: string;
    salt: string;
}
export declare class KeyManager {
    private static readonly ENCRYPTION_ALGORITHM;
    private static readonly KEY_LENGTH;
    private static readonly keyStore;
    /**
     * Encrypt sensitive data (like private keys)
     */
    static encrypt(data: string, password: string): Promise<EncryptedData>;
    /**
     * Decrypt sensitive data
     */
    static decrypt(encryptedData: EncryptedData, password: string): Promise<string>;
    /**
     * Generate a random encryption key
     */
    static generateEncryptionKey(): string;
    /**
     * Validate private key format
     */
    static validatePrivateKey(key: string): boolean;
    /**
     * Store a key securely in memory
     */
    static storeKey(id: string, key: string): void;
    /**
     * Retrieve a stored key
     */
    static getKey(id: string): string | undefined;
    /**
     * Remove a stored key
     */
    static removeKey(id: string): void;
    /**
     * Clear all stored keys
     */
    static clearKeys(): void;
}
