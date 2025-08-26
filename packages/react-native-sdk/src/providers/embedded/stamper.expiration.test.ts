import { ReactNativeStamper } from './stamper';
import * as SecureStore from 'expo-secure-store';

// Mock expo-secure-store
jest.mock('expo-secure-store');
const mockSecureStore = SecureStore as jest.Mocked<typeof SecureStore>;

// Mock @phantom/base64url
let base64urlCounter = 0;
jest.mock('@phantom/base64url', () => ({
  base64urlEncode: jest.fn((_input: Uint8Array) => {
    base64urlCounter++;
    return `mock-base64url-${String.fromCharCode(97 + base64urlCounter)}`; // a, b, c, etc.
  }),
}));

// Mock @phantom/crypto
let cryptoCounter = 0;
jest.mock('@phantom/crypto', () => ({
  generateKeyPair: jest.fn(() => {
    cryptoCounter++;
    return {
      publicKey: `mock-public-key-${cryptoCounter}-${Math.random().toString(36).substring(7)}`,
      secretKey: `mock-secret-key-${cryptoCounter}-${Math.random().toString(36).substring(7)}`,
    };
  }),
}));

describe('ReactNativeStamper Expiration Tests', () => {
  let stamper: ReactNativeStamper;
  let originalDate: typeof Date;
  let storage: Map<string, string>;

  beforeEach(() => {
    // Reset counters
    cryptoCounter = 0;
    base64urlCounter = 0;

    // Mock Date.now() for consistent test results
    originalDate = global.Date;
    const mockDate = new Date('2024-01-01T00:00:00Z');
    global.Date = jest.fn(() => mockDate) as any;
    global.Date.now = jest.fn(() => mockDate.getTime());
    Object.setPrototypeOf(global.Date, originalDate);

    // Setup in-memory storage mock
    storage = new Map();
    mockSecureStore.setItemAsync.mockImplementation((key: string, value: string) => {
      storage.set(key, value);
      return Promise.resolve();
    });
    mockSecureStore.getItemAsync.mockImplementation((key: string) => {
      return Promise.resolve(storage.get(key) || null);
    });
    mockSecureStore.deleteItemAsync.mockImplementation((key: string) => {
      storage.delete(key);
      return Promise.resolve();
    });

    stamper = new ReactNativeStamper({
      keyPrefix: 'test-stamper',
      organizationId: 'test-org',
    });
  });

  afterEach(async () => {
    global.Date = originalDate;
    await stamper.clear();
    storage.clear();
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

  test('should persist keypair state across re-initialization', async () => {
    await stamper.init();
    const originalKeyInfo = stamper.getKeyInfo();
    
    // Create new stamper instance with same config
    const stamper2 = new ReactNativeStamper({
      keyPrefix: 'test-stamper',
      organizationId: 'test-org',
    });
    
    const restoredKeyInfo = await stamper2.init();
    expect(restoredKeyInfo.keyId).toBe(originalKeyInfo!.keyId);
    expect(restoredKeyInfo.publicKey).toBe(originalKeyInfo!.publicKey);
    expect(restoredKeyInfo.createdAt).toBe(originalKeyInfo!.createdAt);
    expect(restoredKeyInfo.expiresAt).toBe(originalKeyInfo!.expiresAt);
  });

  test('should store active and pending keypairs in different secure store keys', async () => {
    await stamper.init();
    await stamper.generateNewKeyPair();
    
    // Check that both active and pending keys are stored
    expect(storage.has('test-stamper-test-org-active')).toBe(true);
    expect(storage.has('test-stamper-test-org-pending')).toBe(true);
    
    const activeRecord = JSON.parse(storage.get('test-stamper-test-org-active')!);
    const pendingRecord = JSON.parse(storage.get('test-stamper-test-org-pending')!);
    
    expect(activeRecord.status).toBe('active');
    expect(pendingRecord.status).toBe('pending');
    expect(activeRecord.keyInfo.keyId).not.toBe(pendingRecord.keyInfo.keyId);
  });

  test('should clear all keypairs when cleared', async () => {
    await stamper.init();
    await stamper.generateNewKeyPair();
    
    await stamper.clear();
    
    expect(stamper.getKeyInfo()).toBeNull();
    expect(stamper.getExpirationInfo().expiresAt).toBeNull();
    expect(storage.size).toBe(0);
  });
});