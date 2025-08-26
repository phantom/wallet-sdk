import { EmbeddedProvider } from './embedded-provider';
import type { EmbeddedProviderConfig, PlatformAdapter, Session } from './interfaces';
import type { StamperWithKeyManagement } from '@phantom/sdk-types';
import type { PhantomClient } from '@phantom/client';

// Mock dependencies
jest.mock('@phantom/client');

// Mock bs58 and base64url dependencies
jest.mock('bs58', () => ({
  decode: jest.fn((_input: string) => new Uint8Array(32).fill(1)), // Mock public key decode
}));

jest.mock('@phantom/base64url', () => ({
  base64urlEncode: jest.fn((_input: Uint8Array) => 'mock-base64url-encoded'),
}));

describe('EmbeddedProvider Renewal Tests', () => {
  let provider: EmbeddedProvider;
  let mockStamper: jest.Mocked<StamperWithKeyManagement>;
  let mockClient: jest.Mocked<PhantomClient>;
  let mockStorage: { [key: string]: any };
  let originalDate: typeof Date;

  beforeEach(() => {
    // Mock Date.now() for consistent test results
    originalDate = global.Date;
    const mockDate = new Date('2024-01-01T00:00:00Z');
    global.Date = jest.fn(() => mockDate) as any;
    global.Date.now = jest.fn(() => mockDate.getTime());
    Object.setPrototypeOf(global.Date, originalDate);

    // Mock storage
    mockStorage = {};
    const mockEmbeddedStorage = {
      getSession: jest.fn().mockImplementation(() => Promise.resolve(mockStorage.session || null)),
      saveSession: jest.fn().mockImplementation((session: Session) => {
        mockStorage.session = session;
        return Promise.resolve();
      }),
      clearSession: jest.fn().mockImplementation(() => {
        delete mockStorage.session;
        return Promise.resolve();
      }),
    };

    // Mock stamper with expiration support
    mockStamper = {
      init: jest.fn().mockResolvedValue({
        keyId: 'test-key-id',
        publicKey: 'test-public-key',
        createdAt: Date.now(),
        expiresAt: Date.now() + (7 * 24 * 60 * 60 * 1000),
      }),
      getKeyInfo: jest.fn().mockReturnValue({
        keyId: 'test-key-id',
        publicKey: 'test-public-key',
        createdAt: Date.now(),
        expiresAt: Date.now() + (7 * 24 * 60 * 60 * 1000),
      }),
      stamp: jest.fn().mockResolvedValue('mock-stamp'),
      algorithm: 'Ed25519' as any,
      type: 'PKI' as const,
      generateNewKeyPair: jest.fn().mockResolvedValue({
        keyId: 'new-key-id',
        publicKey: 'new-public-key',
        createdAt: Date.now(),
        expiresAt: Date.now() + (7 * 24 * 60 * 60 * 1000),
      }),
      switchToNewKeyPair: jest.fn().mockResolvedValue(undefined),
      getExpirationInfo: jest.fn().mockReturnValue({
        expiresAt: Date.now() + (7 * 24 * 60 * 60 * 1000),
        timeUntilExpiry: 7 * 24 * 60 * 60 * 1000,
        shouldRenew: false,
      }),
    };

    // Mock client
    mockClient = {
      createAuthenticator: jest.fn().mockResolvedValue({
        id: 'new-authenticator-id',
        authenticatorName: 'test-auth',
      }),
    } as any;

    // Mock platform adapter
    const mockPlatform: PlatformAdapter = {
      storage: mockEmbeddedStorage,
      authProvider: {} as any,
      urlParamsAccessor: {} as any,
      stamper: mockStamper,
      name: 'test-platform',
    };

    const mockLogger = {
      log: jest.fn(),
      info: jest.fn(),
      error: jest.fn(),
    };

    const config: EmbeddedProviderConfig = {
      organizationId: 'test-org',
      apiBaseUrl: 'https://api.test.com',
      embeddedWalletType: 'app-wallet',
      addressTypes: ['solana'],
      appName: 'Test App',
    };

    provider = new EmbeddedProvider(config, mockPlatform, mockLogger);
    
    // Mock the client property
    (provider as any).client = mockClient;
  });

  afterEach(() => {
    global.Date = originalDate;
  });

  test('should not renew when authenticator is new', async () => {
    const session: Session = {
      sessionId: 'test-session',
      walletId: 'test-wallet',
      organizationId: 'test-org',
      stamperInfo: {
        keyId: 'test-key-id',
        publicKey: 'test-public-key',
        expiresAt: Date.now() + (7 * 24 * 60 * 60 * 1000),
      },
      status: 'completed',
      createdAt: Date.now(),
      lastUsed: Date.now(),
    };
    mockStorage.session = session;

    // Mock that renewal is not needed
    mockStamper.getExpirationInfo.mockReturnValue({
      expiresAt: Date.now() + (7 * 24 * 60 * 60 * 1000),
      timeUntilExpiry: 7 * 24 * 60 * 60 * 1000,
      shouldRenew: false,
    });

    await (provider as any).ensureValidAuthenticator();

    expect(mockStamper.generateNewKeyPair).not.toHaveBeenCalled();
    expect(mockClient.createAuthenticator).not.toHaveBeenCalled();
  });

  test('should renew authenticator when close to expiration', async () => {
    const session: Session = {
      sessionId: 'test-session',
      walletId: 'test-wallet',
      organizationId: 'test-org',
      stamperInfo: {
        keyId: 'test-key-id',
        publicKey: 'test-public-key',
        expiresAt: Date.now() + (1 * 24 * 60 * 60 * 1000), // 1 day left
      },
      status: 'completed',
      createdAt: Date.now(),
      lastUsed: Date.now(),
    };
    mockStorage.session = session;

    // Mock that renewal is needed
    mockStamper.getExpirationInfo.mockReturnValue({
      expiresAt: Date.now() + (1 * 24 * 60 * 60 * 1000),
      timeUntilExpiry: 1 * 24 * 60 * 60 * 1000,
      shouldRenew: true, // Within 2-day renewal window
    });

    // Ensure client is set before calling renewal
    expect((provider as any).client).toBe(mockClient);
    
    await (provider as any).ensureValidAuthenticator();

    expect(mockStamper.generateNewKeyPair).toHaveBeenCalled();
    expect(mockClient.createAuthenticator).toHaveBeenCalledWith(
      expect.objectContaining({
        organizationId: 'test-org',
        replaceExpirable: true,
        authenticator: expect.objectContaining({
          authenticatorKind: 'keypair',
          algorithm: 'Ed25519',
          expiresAtMs: expect.any(Number),
        }),
      })
    );
    expect(mockStamper.switchToNewKeyPair).toHaveBeenCalledWith('new-authenticator-id');
  });

  test('should disconnect when authenticator has expired', async () => {
    const session: Session = {
      sessionId: 'test-session',
      walletId: 'test-wallet',
      organizationId: 'test-org',
      stamperInfo: {
        keyId: 'test-key-id',
        publicKey: 'test-public-key',
        expiresAt: Date.now() - (1 * 24 * 60 * 60 * 1000), // Expired 1 day ago
      },
      status: 'completed',
      createdAt: Date.now(),
      lastUsed: Date.now(),
    };
    mockStorage.session = session;

    // Mock that authenticator has expired
    mockStamper.getExpirationInfo.mockReturnValue({
      expiresAt: Date.now() - (1 * 24 * 60 * 60 * 1000),
      timeUntilExpiry: -1 * 24 * 60 * 60 * 1000,
      shouldRenew: false,
    });

    await expect((provider as any).ensureValidAuthenticator()).rejects.toThrow('Authenticator expired');
    expect(mockStorage.session).toBeUndefined(); // Session should be cleared
  });

  test('should handle renewal failure gracefully', async () => {
    const session: Session = {
      sessionId: 'test-session',
      walletId: 'test-wallet',
      organizationId: 'test-org',
      stamperInfo: {
        keyId: 'test-key-id',
        publicKey: 'test-public-key',
        expiresAt: Date.now() + (1 * 24 * 60 * 60 * 1000),
      },
      status: 'completed',
      createdAt: Date.now(),
      lastUsed: Date.now(),
    };
    mockStorage.session = session;

    // Mock that renewal is needed
    mockStamper.getExpirationInfo.mockReturnValue({
      expiresAt: Date.now() + (1 * 24 * 60 * 60 * 1000),
      timeUntilExpiry: 1 * 24 * 60 * 60 * 1000,
      shouldRenew: true,
    });

    // Mock renewal failure
    mockClient.createAuthenticator.mockRejectedValue(new Error('Network error'));

    // Should not throw - renewal failure should be handled gracefully
    await expect((provider as any).ensureValidAuthenticator()).resolves.not.toThrow();

    expect(mockStamper.generateNewKeyPair).toHaveBeenCalled();
    expect(mockStamper.switchToNewKeyPair).not.toHaveBeenCalled(); // Should not switch on failure
  });

  test('should update session with new expiration after successful renewal', async () => {
    const session: Session = {
      sessionId: 'test-session',
      walletId: 'test-wallet',
      organizationId: 'test-org',
      stamperInfo: {
        keyId: 'old-key-id',
        publicKey: 'old-public-key',
        expiresAt: Date.now() + (1 * 24 * 60 * 60 * 1000),
      },
      status: 'completed',
      createdAt: Date.now(),
      lastUsed: Date.now(),
    };
    mockStorage.session = session;

    // Mock that renewal is needed
    mockStamper.getExpirationInfo.mockReturnValue({
      expiresAt: Date.now() + (1 * 24 * 60 * 60 * 1000),
      timeUntilExpiry: 1 * 24 * 60 * 60 * 1000,
      shouldRenew: true,
    });

    await (provider as any).ensureValidAuthenticator();

    // Check that session was updated with new key info
    expect(mockStorage.session.stamperInfo.keyId).toBe('new-key-id');
    expect(mockStorage.session.stamperInfo.publicKey).toBe('new-public-key');
    expect(mockStorage.session.authenticatorExpiresAt).toBeDefined();
    expect(mockStorage.session.lastRenewalCheck).toBeDefined();
  });

  test('should validate session with expired authenticator', () => {
    const session: Session = {
      sessionId: 'test-session',
      walletId: 'test-wallet',
      organizationId: 'test-org',
      stamperInfo: {
        keyId: 'test-key-id',
        publicKey: 'test-public-key',
        expiresAt: Date.now() - (1 * 24 * 60 * 60 * 1000), // Expired
      },
      status: 'completed',
      createdAt: Date.now() - (2 * 24 * 60 * 60 * 1000),
      lastUsed: Date.now(),
      authenticatorExpiresAt: Date.now() - (1 * 24 * 60 * 60 * 1000), // Expired
    };

    const isValid = (provider as any).isSessionValid(session);
    expect(isValid).toBe(false);
  });

  test('should validate session with valid authenticator', () => {
    const session: Session = {
      sessionId: 'test-session',
      walletId: 'test-wallet',
      organizationId: 'test-org',
      stamperInfo: {
        keyId: 'test-key-id',
        publicKey: 'test-public-key',
        expiresAt: Date.now() + (5 * 24 * 60 * 60 * 1000), // Valid
      },
      status: 'completed',
      createdAt: Date.now(),
      lastUsed: Date.now(),
      authenticatorExpiresAt: Date.now() + (5 * 24 * 60 * 60 * 1000), // Valid
    };

    const isValid = (provider as any).isSessionValid(session);
    expect(isValid).toBe(true);
  });
});