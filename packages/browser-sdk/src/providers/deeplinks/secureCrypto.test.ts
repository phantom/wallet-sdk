/**
 * @jest-environment jsdom
 */

import { SecureCrypto } from './secureCrypto';

// Mock IndexedDB for testing
const mockIndexedDB = () => {
  const mockDB = {
    transaction: jest.fn().mockReturnValue({
      objectStore: jest.fn().mockReturnValue({
        put: jest.fn().mockReturnValue({ onsuccess: null, onerror: null }),
        get: jest.fn().mockReturnValue({ onsuccess: null, onerror: null, result: null }),
        delete: jest.fn().mockReturnValue({ onsuccess: null, onerror: null }),
      })
    })
  };

  const mockRequest = {
    onsuccess: null,
    onerror: null,
    onupgradeneeded: null,
    result: mockDB
  };

  return {
    open: jest.fn().mockReturnValue(mockRequest),
    mockRequest,
    mockDB
  };
};

describe('SecureCrypto', () => {
  let secureCrypto: SecureCrypto;
  let mockIDB: any;

  beforeEach(() => {
    // Mock IndexedDB
    mockIDB = mockIndexedDB();
    (global as any).indexedDB = mockIDB;

    secureCrypto = new SecureCrypto();
  });

  afterEach(() => {
    delete (global as any).indexedDB;
  });

  it('should initialize without throwing', () => {
    expect(secureCrypto).toBeDefined();
  });

  it('should throw error when trying to use before initialization', async () => {
    await expect(secureCrypto.createSharedSecret('test')).rejects.toThrow('SecureCrypto not initialized');
  });

  it('should return null public key before initialization', () => {
    expect(secureCrypto.getPublicKeyBase58()).toBeNull();
  });

  it('should throw error in browser environment check', () => {
    delete (global as any).indexedDB;
    expect(() => new SecureCrypto()).toThrow('SecureCrypto requires a browser environment with IndexedDB support');
  });
});