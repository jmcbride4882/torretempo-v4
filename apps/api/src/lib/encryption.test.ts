import { describe, it, expect, beforeEach } from 'vitest';
import { EncryptionService } from './encryption';

describe('EncryptionService', () => {
  let service: EncryptionService;
  const testSecret = 'test-secret-key-min-32-chars-long-for-testing-purposes';

  beforeEach(() => {
    service = new EncryptionService(testSecret);
  });

  describe('Constructor', () => {
    it('should throw error if secret is too short', () => {
      expect(() => new EncryptionService('short')).toThrow(
        'Encryption secret must be at least 32 characters long'
      );
    });

    it('should accept secret with exactly 32 characters', () => {
      expect(() => new EncryptionService('12345678901234567890123456789012')).not.toThrow();
    });

    it('should accept secret longer than 32 characters', () => {
      expect(() => new EncryptionService(testSecret)).not.toThrow();
    });
  });

  describe('encrypt()', () => {
    it('should encrypt a plaintext string', () => {
      const plaintext = 'Sensitive PII data';
      const encrypted = service.encrypt(plaintext);

      expect(encrypted).toBeDefined();
      expect(typeof encrypted).toBe('string');
      expect(encrypted).not.toBe(plaintext);
    });

    it('should return ciphertext in correct format (iv:authTag:encrypted)', () => {
      const plaintext = 'Test';
      const encrypted = service.encrypt(plaintext);

      const parts = encrypted.split(':');
      expect(parts).toHaveLength(3);
      expect(parts[0]).toBeTruthy(); // IV
      expect(parts[1]).toBeTruthy(); // Auth tag
      expect(parts[2]).toBeTruthy(); // Encrypted data
    });

    it('should produce different ciphertexts for same plaintext (IV randomization)', () => {
      const plaintext = 'Test data';
      const encrypted1 = service.encrypt(plaintext);
      const encrypted2 = service.encrypt(plaintext);

      expect(encrypted1).not.toBe(encrypted2);
    });

    it('should handle empty strings', () => {
      const plaintext = '';
      const encrypted = service.encrypt(plaintext);

      expect(encrypted).toBeDefined();
      expect(typeof encrypted).toBe('string');
      expect(encrypted.split(':')).toHaveLength(3);
    });

    it('should handle unicode characters', () => {
      const plaintext = 'Ñoño España 中文 🎉 Émigré';
      const encrypted = service.encrypt(plaintext);

      expect(encrypted).toBeDefined();
      expect(typeof encrypted).toBe('string');
    });

    it('should handle long strings', () => {
      const plaintext = 'A'.repeat(10000);
      const encrypted = service.encrypt(plaintext);

      expect(encrypted).toBeDefined();
      expect(typeof encrypted).toBe('string');
    });

    it('should throw error for non-string input', () => {
      // @ts-expect-error Testing runtime validation
      expect(() => service.encrypt(123)).toThrow('Plaintext must be a string');

      // @ts-expect-error Testing runtime validation
      expect(() => service.encrypt(null)).toThrow('Plaintext must be a string');

      // @ts-expect-error Testing runtime validation
      expect(() => service.encrypt(undefined)).toThrow('Plaintext must be a string');
    });
  });

  describe('decrypt()', () => {
    it('should decrypt an encrypted string correctly', () => {
      const plaintext = 'Sensitive PII data';
      const encrypted = service.encrypt(plaintext);
      const decrypted = service.decrypt(encrypted);

      expect(decrypted).toBe(plaintext);
    });

    it('should handle empty strings', () => {
      const plaintext = '';
      const encrypted = service.encrypt(plaintext);
      const decrypted = service.decrypt(encrypted);

      expect(decrypted).toBe(plaintext);
    });

    it('should handle unicode characters correctly', () => {
      const plaintext = 'Ñoño España 中文 🎉 Émigré';
      const encrypted = service.encrypt(plaintext);
      const decrypted = service.decrypt(encrypted);

      expect(decrypted).toBe(plaintext);
    });

    it('should handle long strings', () => {
      const plaintext = 'A'.repeat(10000);
      const encrypted = service.encrypt(plaintext);
      const decrypted = service.decrypt(encrypted);

      expect(decrypted).toBe(plaintext);
    });

    it('should throw error for invalid format (missing parts)', () => {
      expect(() => service.decrypt('invalid')).toThrow(
        'Invalid ciphertext format (expected iv:authTag:encrypted)'
      );

      expect(() => service.decrypt('part1:part2')).toThrow(
        'Invalid ciphertext format (expected iv:authTag:encrypted)'
      );

      expect(() => service.decrypt('part1:part2:part3:part4')).toThrow(
        'Invalid ciphertext format (expected iv:authTag:encrypted)'
      );
    });

    it('should throw error for corrupted ciphertext', () => {
      const plaintext = 'Test';
      const encrypted = service.encrypt(plaintext);
      const corrupted = encrypted.replace(/[A-Za-z0-9]/g, 'X');

      expect(() => service.decrypt(corrupted)).toThrow();
    });

    it('should throw error when decrypting with wrong key', () => {
      const plaintext = 'Secret data';
      const encrypted = service.encrypt(plaintext);

      // Create new service with different key
      const otherService = new EncryptionService('different-key-min-32-chars-long-for-testing-purposes');

      expect(() => otherService.decrypt(encrypted)).toThrow(
        'Decryption failed: data may have been tampered with or key is incorrect'
      );
    });

    it('should throw error for tampered auth tag', () => {
      const plaintext = 'Test';
      const encrypted = service.encrypt(plaintext);
      const parts = encrypted.split(':');

      // Tamper with auth tag
      const tamperedAuthTag = Buffer.from(parts[1]!, 'base64');
      tamperedAuthTag[0] = tamperedAuthTag[0]! ^ 0xFF; // Flip bits
      parts[1] = tamperedAuthTag.toString('base64');

      const tampered = parts.join(':');

      expect(() => service.decrypt(tampered)).toThrow(
        'Decryption failed: data may have been tampered with or key is incorrect'
      );
    });

    it('should throw error for tampered ciphertext', () => {
      const plaintext = 'Test data for tampering';
      const encrypted = service.encrypt(plaintext);
      const parts = encrypted.split(':');

      // Tamper with encrypted data by flipping bits
      const encryptedBuffer = Buffer.from(parts[2]!, 'base64');
      if (encryptedBuffer.length > 0) {
        encryptedBuffer[0] = encryptedBuffer[0]! ^ 0xFF; // Flip all bits in first byte
        parts[2] = encryptedBuffer.toString('base64');
      }

      const tampered = parts.join(':');

      expect(() => service.decrypt(tampered)).toThrow(
        'Decryption failed: data may have been tampered with or key is incorrect'
      );
    });

    it('should throw error for non-string input', () => {
      // @ts-expect-error Testing runtime validation
      expect(() => service.decrypt(123)).toThrow('Ciphertext must be a string');

      // @ts-expect-error Testing runtime validation
      expect(() => service.decrypt(null)).toThrow('Ciphertext must be a string');

      // @ts-expect-error Testing runtime validation
      expect(() => service.decrypt(undefined)).toThrow('Ciphertext must be a string');
    });

    it('should throw error for invalid base64', () => {
      // Use valid format but invalid base64 characters
      expect(() => service.decrypt('!!!:!!!:!!!')).toThrow();
    });
  });

  describe('encryptJSON()', () => {
    it('should encrypt a JSON object', () => {
      const data = { dni: '12345678A', ssn: '123456789' };
      const encrypted = service.encryptJSON(data);

      expect(encrypted).toBeDefined();
      expect(typeof encrypted).toBe('string');
      expect(encrypted.split(':')).toHaveLength(3);
    });

    it('should handle nested objects', () => {
      const data = {
        personal: {
          dni: '12345678A',
          name: 'Juan García',
        },
        contact: {
          phone: '+34 123 456 789',
          email: 'juan@example.com',
        },
      };
      const encrypted = service.encryptJSON(data);

      expect(encrypted).toBeDefined();
      expect(typeof encrypted).toBe('string');
    });

    it('should handle arrays', () => {
      const data = [1, 2, 3, 'four', { five: 5 }];
      const encrypted = service.encryptJSON(data);

      expect(encrypted).toBeDefined();
      expect(typeof encrypted).toBe('string');
    });

    it('should handle null values', () => {
      const data = { field: null };
      const encrypted = service.encryptJSON(data);

      expect(encrypted).toBeDefined();
      expect(typeof encrypted).toBe('string');
    });

    it('should handle primitive types', () => {
      expect(() => service.encryptJSON(123)).not.toThrow();
      expect(() => service.encryptJSON('string')).not.toThrow();
      expect(() => service.encryptJSON(true)).not.toThrow();
      expect(() => service.encryptJSON(null)).not.toThrow();
    });
  });

  describe('decryptJSON()', () => {
    it('should decrypt a JSON object correctly', () => {
      const data = { dni: '12345678A', ssn: '123456789' };
      const encrypted = service.encryptJSON(data);
      const decrypted = service.decryptJSON<typeof data>(encrypted);

      expect(decrypted).toEqual(data);
    });

    it('should preserve object structure', () => {
      const data = {
        personal: {
          dni: '12345678A',
          name: 'Juan García',
        },
        contact: {
          phone: '+34 123 456 789',
          email: 'juan@example.com',
        },
      };
      const encrypted = service.encryptJSON(data);
      const decrypted = service.decryptJSON<typeof data>(encrypted);

      expect(decrypted).toEqual(data);
      expect(decrypted.personal.dni).toBe('12345678A');
      expect(decrypted.contact.phone).toBe('+34 123 456 789');
    });

    it('should preserve arrays', () => {
      const data = [1, 2, 3, 'four', { five: 5 }];
      const encrypted = service.encryptJSON(data);
      const decrypted = service.decryptJSON<typeof data>(encrypted);

      expect(decrypted).toEqual(data);
      expect(Array.isArray(decrypted)).toBe(true);
    });

    it('should preserve null values', () => {
      const data = { field: null };
      const encrypted = service.encryptJSON(data);
      const decrypted = service.decryptJSON<typeof data>(encrypted);

      expect(decrypted).toEqual(data);
      expect(decrypted.field).toBeNull();
    });

    it('should throw error for invalid ciphertext', () => {
      expect(() => service.decryptJSON('invalid')).toThrow('Failed to decrypt JSON');
    });

    it('should throw error when JSON parsing fails', () => {
      // Encrypt a non-JSON string
      const encrypted = service.encrypt('not a json string');

      expect(() => service.decryptJSON(encrypted)).toThrow('Failed to decrypt JSON');
    });
  });

  describe('Performance', () => {
    it('should encrypt within performance target (<50ms per operation)', () => {
      const plaintext = 'Performance test data';
      const iterations = 100;

      const start = Date.now();
      for (let i = 0; i < iterations; i++) {
        service.encrypt(plaintext);
      }
      const elapsed = Date.now() - start;
      const avgTime = elapsed / iterations;

      expect(avgTime).toBeLessThan(50);
    });

    it('should decrypt within performance target (<50ms per operation)', () => {
      const plaintext = 'Performance test data';
      const encrypted = service.encrypt(plaintext);
      const iterations = 100;

      const start = Date.now();
      for (let i = 0; i < iterations; i++) {
        service.decrypt(encrypted);
      }
      const elapsed = Date.now() - start;
      const avgTime = elapsed / iterations;

      expect(avgTime).toBeLessThan(50);
    });

    it('should complete 1000 encrypt+decrypt operations within 5 seconds', () => {
      const plaintext = 'Test data';
      const iterations = 1000;

      const start = Date.now();
      for (let i = 0; i < iterations; i++) {
        const encrypted = service.encrypt(plaintext + i);
        const decrypted = service.decrypt(encrypted);
        expect(decrypted).toBe(plaintext + i);
      }
      const elapsed = Date.now() - start;

      expect(elapsed).toBeLessThan(5000);
    });
  });

  describe('Security Properties', () => {
    it('should use different IVs for each encryption', () => {
      const plaintext = 'Test';
      const encrypted1 = service.encrypt(plaintext);
      const encrypted2 = service.encrypt(plaintext);

      const iv1 = encrypted1.split(':')[0];
      const iv2 = encrypted2.split(':')[0];

      expect(iv1).not.toBe(iv2);
    });

    it('should produce different auth tags for different plaintexts', () => {
      const encrypted1 = service.encrypt('Test 1');
      const encrypted2 = service.encrypt('Test 2');

      const authTag1 = encrypted1.split(':')[1];
      const authTag2 = encrypted2.split(':')[1];

      expect(authTag1).not.toBe(authTag2);
    });

    it('should detect any modification to ciphertext', () => {
      const plaintext = 'Test';
      const encrypted = service.encrypt(plaintext);

      // Try modifying each part
      const parts = encrypted.split(':');

      // Modify IV
      const modifiedIV = parts[0]!.slice(0, -1) + 'X';
      expect(() => service.decrypt([modifiedIV, parts[1], parts[2]].join(':'))).toThrow();

      // Modify auth tag by flipping bits
      const authTagBuffer = Buffer.from(parts[1]!, 'base64');
      authTagBuffer[0] = authTagBuffer[0]! ^ 0xFF; // Flip all bits in first byte
      const modifiedAuthTag = authTagBuffer.toString('base64');
      expect(() => service.decrypt([parts[0], modifiedAuthTag, parts[2]].join(':'))).toThrow();

      // Modify ciphertext by flipping bits
      const ciphertextBuffer = Buffer.from(parts[2]!, 'base64');
      if (ciphertextBuffer.length > 0) {
        ciphertextBuffer[0] = ciphertextBuffer[0]! ^ 0xFF; // Flip all bits in first byte
        const modifiedCiphertext = ciphertextBuffer.toString('base64');
        expect(() => service.decrypt([parts[0], parts[1], modifiedCiphertext].join(':'))).toThrow();
      }
    });
  });

  describe('Edge Cases', () => {
    it('should handle very long plaintexts', () => {
      const plaintext = 'A'.repeat(100000); // 100KB
      const encrypted = service.encrypt(plaintext);
      const decrypted = service.decrypt(encrypted);

      expect(decrypted).toBe(plaintext);
    });

    it('should handle special characters and control characters', () => {
      const plaintext = '\n\r\t\0\\\'\"';
      const encrypted = service.encrypt(plaintext);
      const decrypted = service.decrypt(encrypted);

      expect(decrypted).toBe(plaintext);
    });

    it('should handle emojis and multi-byte characters', () => {
      const plaintext = '👨‍👩‍👧‍👦 Family emoji 🎉 Party 中文字符';
      const encrypted = service.encrypt(plaintext);
      const decrypted = service.decrypt(encrypted);

      expect(decrypted).toBe(plaintext);
    });

    it('should be deterministic for same service instance', () => {
      // While encrypted values differ due to random IV,
      // decryption should always work for any encryption from same instance
      const plaintext = 'Test';

      for (let i = 0; i < 10; i++) {
        const encrypted = service.encrypt(plaintext);
        const decrypted = service.decrypt(encrypted);
        expect(decrypted).toBe(plaintext);
      }
    });

    it('should handle concurrent encryptions (no state pollution)', () => {
      const plaintexts = Array.from({ length: 100 }, (_, i) => `Test ${i}`);

      // Encrypt all
      const encrypted = plaintexts.map(p => service.encrypt(p));

      // Decrypt all and verify
      encrypted.forEach((enc, i) => {
        const decrypted = service.decrypt(enc);
        expect(decrypted).toBe(plaintexts[i]);
      });
    });
  });
});

describe('Singleton instance', () => {
  it('should export a default encryption instance', async () => {
    // Dynamically import to avoid environment variable issues
    const { encryption } = await import('./encryption');

    expect(encryption).toBeDefined();
    expect(encryption.encrypt).toBeDefined();
    expect(encryption.decrypt).toBeDefined();
  });

  it('should work with the singleton instance', async () => {
    const { encryption } = await import('./encryption');

    const plaintext = 'Test with singleton';
    const encrypted = encryption.encrypt(plaintext);
    const decrypted = encryption.decrypt(encrypted);

    expect(decrypted).toBe(plaintext);
  });
});
