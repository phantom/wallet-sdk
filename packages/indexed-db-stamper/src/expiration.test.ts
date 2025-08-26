import { IndexedDbStamper } from './index';
import 'fake-indexeddb/auto';

// Mock Web Crypto API for testing
let keyCounter = 0;
Object.defineProperty(global, 'crypto', {
  value: {
    subtle: {
      generateKey: jest.fn().mockImplementation(() => {
        keyCounter++;
        return Promise.resolve({
          publicKey: { 
            type: 'public', 
            extractable: true, 
            algorithm: { name: 'Ed25519' }, 
            usages: ['verify'],
            _id: `public-key-${keyCounter}` // Add unique identifier
          },
          privateKey: { 
            type: 'private', 
            extractable: false, 
            algorithm: { name: 'Ed25519' }, 
            usages: ['sign'],
            _id: `private-key-${keyCounter}` // Add unique identifier
          }
        });
      }),
      exportKey: jest.fn().mockImplementation((format, key) => {
        if (format === 'raw' && key.type === 'public') {
          // Return a unique mock public key based on key ID
          const keyId = key._id || 'default';
          const keyBytes = new Uint8Array(32);
          keyBytes.fill(keyId.charCodeAt(keyId.length - 1) || 1);
          return Promise.resolve(keyBytes.buffer);
        }
        throw new Error('Unsupported key export');
      }),
      sign: jest.fn().mockImplementation((algorithm, key, _data) => {
        // Return a unique mock signature based on private key ID
        const keyId = key._id || 'default';
        const sigBytes = new Uint8Array(64);
        sigBytes.fill(keyId.charCodeAt(keyId.length - 1) || 2);
        return Promise.resolve(sigBytes.buffer);
      }),
      digest: jest.fn().mockImplementation((algorithm, data) => {
        // Return a unique mock SHA-256 hash based on input data content
        const hashBytes = new Uint8Array(32);
        const inputArray = new Uint8Array(data);
        // Use the first byte of input data to make hash unique
        hashBytes.fill(inputArray[0] || Math.floor(Math.random() * 256));
        return Promise.resolve(hashBytes.buffer);
      }),
    }
  }
});

describe('IndexedDbStamper Expiration Tests', () => {
  let stamper: IndexedDbStamper;
  let originalDate: typeof Date;

  beforeEach(() => {
    // Mock Date.now() for consistent test results
    originalDate = global.Date;
    const mockDate = new Date('2024-01-01T00:00:00Z');
    global.Date = jest.fn(() => mockDate) as any;
    global.Date.now = jest.fn(() => mockDate.getTime());
    Object.setPrototypeOf(global.Date, originalDate);

    stamper = new IndexedDbStamper({
      dbName: 'test-expiration-db',
      storeName: 'test-store',
      keyName: 'test-key',
    });
  });

  afterEach(async () => {
    global.Date = originalDate;
    await stamper.clear();
  });

  test('should initialize with expiration timestamps', async () => {
    const keyInfo = await stamper.init();
    
    expect(keyInfo.createdAt).toBeDefined();
    expect(keyInfo.expiresAt).toBeDefined();
    expect(keyInfo.expiresAt! - keyInfo.createdAt!).toBe(7 * 24 * 60 * 60 * 1000); // 7 days
  });

  test('should return correct expiration info', async () => {
    await stamper.init();
    const expirationInfo = stamper.getExpirationInfo();
    
    expect(expirationInfo.expiresAt).toBeDefined();
    expect(expirationInfo.timeUntilExpiry).toBeDefined();
    expect(expirationInfo.shouldRenew).toBe(false); // New key shouldn't need renewal
  });

  test('should indicate renewal needed when close to expiration', async () => {
    await stamper.init();
    
    // Mock time to be 6 days later (within 2-day renewal window)
    const sixDaysLater = Date.now() + (6 * 24 * 60 * 60 * 1000);
    global.Date.now = jest.fn(() => sixDaysLater);
    
    const expirationInfo = stamper.getExpirationInfo();
    expect(expirationInfo.shouldRenew).toBe(true);
  });

  test('should generate new keypair for rotation', async () => {
    await stamper.init();
    const originalKeyInfo = stamper.getKeyInfo();
    
    const newKeyInfo = await stamper.generateNewKeyPair();
    
    expect(newKeyInfo.keyId).not.toBe(originalKeyInfo!.keyId);
    expect(newKeyInfo.publicKey).not.toBe(originalKeyInfo!.publicKey);
    expect(newKeyInfo.createdAt).toBeDefined();
    expect(newKeyInfo.expiresAt).toBeDefined();
    
    // Original key should still be active
    expect(stamper.getKeyInfo()!.keyId).toBe(originalKeyInfo!.keyId);
  });

  test('should switch to new keypair successfully', async () => {
    await stamper.init();
    const _originalKeyInfo = stamper.getKeyInfo();
    
    const newKeyInfo = await stamper.generateNewKeyPair();
    await stamper.switchToNewKeyPair('test-authenticator-id');
    
    const activeKeyInfo = stamper.getKeyInfo();
    expect(activeKeyInfo!.keyId).toBe(newKeyInfo.keyId);
    expect(activeKeyInfo!.publicKey).toBe(newKeyInfo.publicKey);
    expect(activeKeyInfo!.authenticatorId).toBe('test-authenticator-id');
  });

  test('should throw error when switching without pending keypair', async () => {
    await stamper.init();
    
    await expect(stamper.switchToNewKeyPair('test-id')).rejects.toThrow(
      'No pending keypair to switch to'
    );
  });

  test('should maintain signing capability throughout rotation', async () => {
    await stamper.init();
    const testData = Buffer.from('test-data', 'utf8');
    
    // Sign with original keypair
    const originalStamp = await stamper.stamp({ data: testData });
    expect(originalStamp).toBeDefined();
    
    // Generate new keypair
    await stamper.generateNewKeyPair();
    
    // Should still sign with original keypair
    const duringRotationStamp = await stamper.stamp({ data: testData });
    expect(duringRotationStamp).toBeDefined();
    
    // Switch to new keypair
    await stamper.switchToNewKeyPair('test-id');
    
    // Should sign with new keypair
    const newStamp = await stamper.stamp({ data: testData });
    expect(newStamp).toBeDefined();
    expect(newStamp).not.toBe(originalStamp); // Different signature with new key
  });

  test('should persist keypair state across re-initialization', async () => {
    await stamper.init();
    const originalKeyInfo = stamper.getKeyInfo();
    
    // Create new stamper instance with same config
    const stamper2 = new IndexedDbStamper({
      dbName: 'test-expiration-db',
      storeName: 'test-store',
      keyName: 'test-key',
    });
    
    const restoredKeyInfo = await stamper2.init();
    expect(restoredKeyInfo.keyId).toBe(originalKeyInfo!.keyId);
    expect(restoredKeyInfo.publicKey).toBe(originalKeyInfo!.publicKey);
    expect(restoredKeyInfo.createdAt).toBe(originalKeyInfo!.createdAt);
    expect(restoredKeyInfo.expiresAt).toBe(originalKeyInfo!.expiresAt);
  });

  test('should clear all keypairs when cleared', async () => {
    await stamper.init();
    await stamper.generateNewKeyPair();
    
    await stamper.clear();
    
    expect(stamper.getKeyInfo()).toBeNull();
    expect(stamper.getExpirationInfo().expiresAt).toBeNull();
  });
});