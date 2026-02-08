import { createCipheriv, createDecipheriv, randomBytes, pbkdf2Sync } from 'crypto';

/**
 * Encryption service for protecting PII (Personal Identifiable Information)
 * Uses AES-256-GCM with PBKDF2 key derivation
 * Compliant with Spanish GDPR (RGPD) requirements
 * 
 * @example
 * ```typescript
 * import { encryption } from './encryption';
 * 
 * const encrypted = encryption.encrypt('12345678A'); // DNI
 * const decrypted = encryption.decrypt(encrypted);
 * ```
 */
export class EncryptionService {
  private masterKey: Buffer;
  private readonly algorithm = 'aes-256-gcm';
  private readonly ivLength = 12; // 12 bytes for GCM (96 bits)
  private readonly authTagLength = 16; // 16 bytes for GCM auth tag
  private readonly iterations = 100000; // PBKDF2 iterations (NIST recommendation)
  private readonly keyLength = 32; // 32 bytes for AES-256

  /**
   * Creates a new EncryptionService instance
   * @param secret - Master secret for key derivation (minimum 32 bytes recommended)
   * @throws Error if secret is too short
   */
  constructor(secret: string) {
    // Validate secret length
    if (secret.length < 32) {
      throw new Error('Encryption secret must be at least 32 characters long');
    }

    // Derive master key using PBKDF2
    // Use a fixed salt for the master key (in production, this should be stored securely)
    const salt = Buffer.from('torretempo-v4-master-salt-2026', 'utf-8');
    this.masterKey = pbkdf2Sync(secret, salt, this.iterations, this.keyLength, 'sha256');
  }

  /**
   * Encrypts a plaintext string using AES-256-GCM
   * @param plaintext - String to encrypt
   * @returns Base64 encoded string in format: iv:authTag:encrypted
   * @throws Error if plaintext is not a string
   * 
   * @example
   * ```typescript
   * const encrypted = service.encrypt('Sensitive data');
   * // Returns: "base64_iv:base64_authTag:base64_encrypted"
   * ```
   */
  encrypt(plaintext: string): string {
    if (typeof plaintext !== 'string') {
      throw new Error('Plaintext must be a string');
    }

    // Generate random IV (Initialization Vector) for this encryption
    const iv = randomBytes(this.ivLength);

    // Create cipher with AES-256-GCM
    const cipher = createCipheriv(this.algorithm, this.masterKey, iv);

    // Encrypt plaintext
    let encrypted = cipher.update(plaintext, 'utf8', 'base64');
    encrypted += cipher.final('base64');

    // Get authentication tag (provides integrity and authenticity)
    const authTag = cipher.getAuthTag();

    // Return format: iv:authTag:encrypted (all base64 encoded)
    return `${iv.toString('base64')}:${authTag.toString('base64')}:${encrypted}`;
  }

  /**
   * Decrypts a ciphertext string
   * @param ciphertext - Encrypted string in format: iv:authTag:encrypted
   * @returns Original plaintext
   * @throws Error if decryption fails or authentication tag is invalid
   * 
   * @example
   * ```typescript
   * const decrypted = service.decrypt('base64_iv:base64_authTag:base64_encrypted');
   * // Returns: "Sensitive data"
   * ```
   */
  decrypt(ciphertext: string): string {
    if (typeof ciphertext !== 'string') {
      throw new Error('Ciphertext must be a string');
    }

    // Split ciphertext into components
    const parts = ciphertext.split(':');
    if (parts.length !== 3) {
      throw new Error('Invalid ciphertext format (expected iv:authTag:encrypted)');
    }

    // Extract components (using non-null assertion since we validated length)
    const ivBase64 = parts[0]!;
    const authTagBase64 = parts[1]!;
    const encryptedBase64 = parts[2]!;

    // Note: encryptedBase64 can be empty string for empty plaintext, so we don't validate emptiness

    // Decode from base64
    let iv: Buffer;
    let authTag: Buffer;
    try {
      iv = Buffer.from(ivBase64, 'base64');
      authTag = Buffer.from(authTagBase64, 'base64');
    } catch (error) {
      throw new Error('Invalid base64 encoding in ciphertext');
    }

    // Validate lengths
    if (iv.length !== this.ivLength) {
      throw new Error(`Invalid IV length (expected ${this.ivLength}, got ${iv.length})`);
    }
    if (authTag.length !== this.authTagLength) {
      throw new Error(`Invalid auth tag length (expected ${this.authTagLength}, got ${authTag.length})`);
    }

    // Create decipher with AES-256-GCM
    const decipher = createDecipheriv(this.algorithm, this.masterKey, iv);

    // Set authentication tag (must be called before update/final)
    decipher.setAuthTag(authTag);

    // Decrypt
    try {
      let decrypted = decipher.update(encryptedBase64, 'base64', 'utf8');
      decrypted += decipher.final('utf8');
      return decrypted;
    } catch (error) {
      // Authentication tag verification failed or decryption error
      throw new Error('Decryption failed: data may have been tampered with or key is incorrect');
    }
  }

  /**
   * Encrypts a JSON object (for JSONB database fields)
   * @param data - Object to encrypt
   * @returns Encrypted string
   * @throws Error if JSON serialization or encryption fails
   * 
   * @example
   * ```typescript
   * const encrypted = service.encryptJSON({ dni: '12345678A', ssn: '123456789' });
   * ```
   */
  encryptJSON<T>(data: T): string {
    try {
      const json = JSON.stringify(data);
      return this.encrypt(json);
    } catch (error) {
      throw new Error(`Failed to encrypt JSON: ${error instanceof Error ? error.message : 'unknown error'}`);
    }
  }

  /**
   * Decrypts a JSON object
   * @param ciphertext - Encrypted string
   * @returns Decrypted object
   * @throws Error if decryption or JSON parsing fails
   * 
   * @example
   * ```typescript
   * const decrypted = service.decryptJSON<{ dni: string }>(encrypted);
   * // Returns: { dni: '12345678A', ssn: '123456789' }
   * ```
   */
  decryptJSON<T>(ciphertext: string): T {
    try {
      const json = this.decrypt(ciphertext);
      return JSON.parse(json) as T;
    } catch (error) {
      throw new Error(`Failed to decrypt JSON: ${error instanceof Error ? error.message : 'unknown error'}`);
    }
  }
}

/**
 * Singleton instance using ENCRYPTION_KEY from environment
 * Falls back to development key with warning if not set
 * 
 * @example
 * ```typescript
 * import { encryption } from './encryption';
 * 
 * const encrypted = encryption.encrypt('Sensitive data');
 * ```
 */
export const encryption = new EncryptionService(
  process.env.ENCRYPTION_KEY || (() => {
    const fallbackKey = 'development-key-min-32-chars-long-INSECURE-DO-NOT-USE-IN-PRODUCTION';
    if (!process.env.ENCRYPTION_KEY) {
      console.warn('⚠️  WARNING: ENCRYPTION_KEY not set in environment. Using insecure development key.');
      console.warn('⚠️  Set ENCRYPTION_KEY in .env for production use.');
    }
    return fallbackKey;
  })()
);
