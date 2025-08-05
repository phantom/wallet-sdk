import { EmbeddedProvider } from './index';
import type { EmbeddedProviderConfig, Session, AuthResult } from '@phantom/embedded-provider-core';
import { BrowserStorage, BrowserURLParamsAccessor, BrowserAuthProvider, BrowserLogger } from './adapters';
import { PhantomClient, generateKeyPair } from '@phantom/client';

// Mock dependencies
jest.mock('./adapters');
jest.mock('@phantom/api-key-stamper');
jest.mock('@phantom/client');

// Cast mocked functions for type safety
const mockedGenerateKeyPair = jest.mocked(generateKeyPair);
const mockedPhantomClient = jest.mocked(PhantomClient);

// Set up generateKeyPair mock
mockedGenerateKeyPair.mockReturnValue({
  publicKey: 'test-public-key',
  secretKey: 'test-secret-key',
});

describe('EmbeddedProvider Auth Flows', () => {
  let provider: EmbeddedProvider;
  let mockStorage: jest.Mocked<BrowserStorage>;
  let mockAuthProvider: jest.Mocked<BrowserAuthProvider>;
  let mockURLParamsAccessor: jest.Mocked<BrowserURLParamsAccessor>;
  let mockLogger: jest.Mocked<BrowserLogger>;
  let mockClient: jest.Mocked<PhantomClient>;
  let config: EmbeddedProviderConfig;

  beforeEach(() => {
    // Reset mocks
    jest.clearAllMocks();
    
    // Reset generateKeyPair mock
    mockedGenerateKeyPair.mockReturnValue({
      publicKey: 'test-public-key',
      secretKey: 'test-secret-key',
    });

    // Setup config
    config = {
      apiBaseUrl: 'https://api.example.com',
      organizationId: 'test-org-id',
      embeddedWalletType: 'user-wallet',
      addressTypes: ['solana'],
      solanaProvider: 'web3js',
      authOptions: {
        authUrl: 'https://auth.example.com',
        redirectUrl: 'https://app.example.com/callback',
      },
    };

    // Mock BrowserStorage
    mockStorage = {
      getSession: jest.fn(),
      saveSession: jest.fn(),
      clearSession: jest.fn(),
    } as any;
    (BrowserStorage as jest.Mock).mockImplementation(() => mockStorage);

    // Mock BrowserURLParamsAccessor
    mockURLParamsAccessor = {
      getParam: jest.fn().mockReturnValue(null),
    } as any;
    (BrowserURLParamsAccessor as jest.Mock).mockImplementation(() => mockURLParamsAccessor);

    // Mock BrowserAuthProvider
    mockAuthProvider = {
      authenticate: jest.fn(),
      resumeAuthFromRedirect: jest.fn(),
    } as any;
    (BrowserAuthProvider as jest.Mock).mockImplementation(() => mockAuthProvider);

    // Mock BrowserLogger
    mockLogger = {
      info: jest.fn(),
      warn: jest.fn(),
      error: jest.fn(),
      log: jest.fn(),
    } as any;
    (BrowserLogger as jest.Mock).mockImplementation(() => mockLogger);

    // Mock PhantomClient
    mockClient = {
      createOrganization: jest.fn(),
      createWallet: jest.fn(),
      getWalletAddresses: jest.fn(),
      signMessage: jest.fn(),
      signAndSendTransaction: jest.fn(),
    } as any;
    mockedPhantomClient.mockImplementation(() => mockClient);

    provider = new EmbeddedProvider(config);
  });

  describe('Google OAuth Flow', () => {
    it('should initiate redirect when connecting with provider google', async () => {
      mockStorage.getSession.mockResolvedValue(null);
      mockAuthProvider.resumeAuthFromRedirect.mockReturnValue(null);
      mockClient.createOrganization.mockResolvedValue({ organizationId: 'new-org-id' });

      await provider.connect({ provider: 'google' });

      expect(mockAuthProvider.authenticate).toHaveBeenCalledWith(
        expect.objectContaining({
          provider: 'google',
          redirectUrl: config.authOptions?.redirectUrl,
        })
      );
    });

    it('should save temporary session before google redirect', async () => {
      mockStorage.getSession.mockResolvedValue(null);
      mockAuthProvider.resumeAuthFromRedirect.mockReturnValue(null);
      mockClient.createOrganization.mockResolvedValue({ organizationId: 'new-org-id' });

      await provider.connect({ provider: 'google' });

      expect(mockStorage.saveSession).toHaveBeenCalledWith(
        expect.objectContaining({
          status: 'pending',
          authProvider: 'phantom-connect',
          userInfo: { provider: 'google' },
        })
      );
    });

    it('should update session timestamp before google redirect to prevent race condition', async () => {
      mockStorage.getSession.mockResolvedValue(null);
      mockAuthProvider.resumeAuthFromRedirect.mockReturnValue(null);
      mockClient.createOrganization.mockResolvedValue({ organizationId: 'new-org-id' });

      const saveSpy = jest.spyOn(mockStorage, 'saveSession');
      await provider.connect({ provider: 'google' });

      // Should be called once for redirect flow (includes timestamp update before redirect)
      expect(saveSpy).toHaveBeenCalledTimes(1);
      const calls = saveSpy.mock.calls;
      expect(calls[0][0]).toMatchObject({
        lastUsed: expect.any(Number),
        status: 'pending',
      });
    });
  });

  describe('Resume from Redirect Flow', () => {
    it('should resume connect from redirect with valid auth result', async () => {
      const authResult: AuthResult = {
        walletId: 'wallet-123',
        provider: 'google',
        userInfo: { email: 'test@example.com' },
      };
      mockAuthProvider.resumeAuthFromRedirect.mockReturnValue(authResult);

      const existingSession: Session = {
        sessionId: 'test-session-id',
        walletId: 'temp-wallet',
        organizationId: 'org-123',
        keypair: { publicKey: 'pub', secretKey: 'sec' },
        authProvider: 'phantom-connect',
        userInfo: {},
        status: 'pending',
        createdAt: Date.now(),
        lastUsed: Date.now(),
      };
      mockStorage.getSession.mockResolvedValue(existingSession);
      mockClient.getWalletAddresses.mockResolvedValue([
        { addressType: 'solana', address: 'test-address' },
      ]);

      const result = await provider.connect();

      expect(result.walletId).toBe('wallet-123');
      expect(result.addresses).toHaveLength(1);
    });

    it('should complete auth connection and update session with wallet ID from redirect', async () => {
      const authResult: AuthResult = {
        walletId: 'wallet-123',
        provider: 'google',
        userInfo: { email: 'test@example.com' },
      };
      mockAuthProvider.resumeAuthFromRedirect.mockReturnValue(authResult);

      const existingSession: Session = {
        sessionId: 'test-session-id',
        walletId: 'temp-wallet',
        organizationId: 'org-123',
        keypair: { publicKey: 'pub', secretKey: 'sec' },
        authProvider: 'phantom-connect',
        userInfo: {},
        status: 'pending',
        createdAt: Date.now(),
        lastUsed: Date.now(),
      };
      mockStorage.getSession.mockResolvedValue(existingSession);
      mockClient.getWalletAddresses.mockResolvedValue([]);

      await provider.connect();

      expect(mockStorage.saveSession).toHaveBeenCalledWith(
        expect.objectContaining({
          walletId: 'wallet-123',
          status: 'completed',
          authProvider: 'google',
          userInfo: expect.objectContaining({ email: 'test@example.com' }),
        })
      );
    });

    it('should initialize client and fetch addresses after successful redirect resume', async () => {
      const authResult: AuthResult = {
        walletId: 'wallet-123',
        provider: 'google',
        userInfo: { email: 'test@example.com' },
      };
      mockAuthProvider.resumeAuthFromRedirect.mockReturnValue(authResult);

      const existingSession: Session = {
        sessionId: 'test-session-id',
        walletId: 'temp-wallet',
        organizationId: 'org-123',
        keypair: { publicKey: 'pub', secretKey: 'sec' },
        authProvider: 'phantom-connect',
        userInfo: {},
        status: 'pending',
        createdAt: Date.now(),
        lastUsed: Date.now(),
      };
      mockStorage.getSession.mockResolvedValue(existingSession);
      mockClient.getWalletAddresses.mockResolvedValue([
        { addressType: 'solana', address: 'test-address' },
      ]);

      await provider.connect();

      expect(PhantomClient).toHaveBeenCalledWith(
        expect.objectContaining({
          organizationId: 'org-123',
        }),
        expect.any(Object)
      );
      expect(mockClient.getWalletAddresses).toHaveBeenCalledWith('wallet-123');
    });
  });

  describe('Resume from Redirect - Invalid Session ID', () => {
    it('should handle resume connect from redirect but with invalid session id in URL', async () => {
      mockAuthProvider.resumeAuthFromRedirect.mockReturnValue(null);
      // Mock URL params accessor to return different session ID
      mockURLParamsAccessor.getParam.mockReturnValue('different-session-id');

      const existingSession: Session = {
        sessionId: 'test-session-id',
        walletId: 'temp-wallet',
        organizationId: 'org-123',
        keypair: { publicKey: 'pub', secretKey: 'sec' },
        authProvider: 'phantom-connect',
        userInfo: {},
        status: 'pending',
        createdAt: Date.now(),
        lastUsed: Date.now(),
      };
      mockStorage.getSession.mockResolvedValue(existingSession);
      mockClient.createOrganization.mockResolvedValue({ organizationId: 'new-org-id' });

      await provider.connect();

      expect(mockStorage.clearSession).toHaveBeenCalled();
    });

    it('should clear invalid session when URL session ID does not match stored session', async () => {
      mockAuthProvider.resumeAuthFromRedirect.mockReturnValue(null);
      // Mock URL params accessor to return different session ID
      mockURLParamsAccessor.getParam.mockReturnValue('different-session-id');

      const existingSession: Session = {
        sessionId: 'test-session-id',
        walletId: 'temp-wallet',
        organizationId: 'org-123',
        keypair: { publicKey: 'pub', secretKey: 'sec' },
        authProvider: 'phantom-connect',
        userInfo: {},
        status: 'pending',
        createdAt: Date.now(),
        lastUsed: Date.now(),
      };
      mockStorage.getSession.mockResolvedValue(existingSession);
      mockClient.createOrganization.mockResolvedValue({ organizationId: 'new-org-id' });

      await provider.connect();

      expect(mockStorage.clearSession).toHaveBeenCalled();
      // Should create new organization since session was cleared
      expect(mockClient.createOrganization).toHaveBeenCalled();
    });

    it('should start fresh authentication flow when session ID mismatch detected', async () => {
      mockAuthProvider.resumeAuthFromRedirect.mockReturnValue(null);
      // Mock URL params accessor to return different session ID
      mockURLParamsAccessor.getParam.mockReturnValue('different-session-id');

      const existingSession: Session = {
        sessionId: 'test-session-id',
        walletId: 'temp-wallet',
        organizationId: 'org-123',
        keypair: { publicKey: 'pub', secretKey: 'sec' },
        authProvider: 'phantom-connect',
        userInfo: {},
        status: 'pending',
        createdAt: Date.now(),
        lastUsed: Date.now(),
      };
      mockStorage.getSession.mockResolvedValue(existingSession);
      mockClient.createOrganization.mockResolvedValue({ organizationId: 'new-org-id' });

      await provider.connect();

      // Should start fresh flow
      expect(mockClient.createOrganization).toHaveBeenCalled();
      expect(mockAuthProvider.authenticate).toHaveBeenCalled();
    });
  });

  describe('Resume from Redirect - Missing Local Session', () => {
    it('should handle resume connect from redirect but we do not have a local session stored', async () => {
      const authResult: AuthResult = {
        walletId: 'wallet-123',
        provider: 'google',
        userInfo: { email: 'test@example.com' },
      };
      mockAuthProvider.resumeAuthFromRedirect.mockReturnValue(authResult);
      mockStorage.getSession.mockResolvedValue(null);

      await expect(provider.connect()).rejects.toThrow();
    });

    it('should throw error when no session found after redirect', async () => {
      const authResult: AuthResult = {
        walletId: 'wallet-123',
        provider: 'google',
        userInfo: { email: 'test@example.com' },
      };
      mockAuthProvider.resumeAuthFromRedirect.mockReturnValue(authResult);
      mockStorage.getSession.mockResolvedValue(null);

      await expect(provider.connect()).rejects.toThrow(
        'No session found after redirect - session may have expired'
      );
    });

    it('should provide clear error message about session expiration', async () => {
      const authResult: AuthResult = {
        walletId: 'wallet-123',
        provider: 'google',
        userInfo: { email: 'test@example.com' },
      };
      mockAuthProvider.resumeAuthFromRedirect.mockReturnValue(authResult);
      mockStorage.getSession.mockResolvedValue(null);

      await expect(provider.connect()).rejects.toThrow(/session may have expired/);
    });
  });

  describe('App Wallet Flow', () => {
    beforeEach(() => {
      config.embeddedWalletType = 'app-wallet';
      provider = new EmbeddedProvider(config);
    });

    it('should create app wallet directly without authentication', async () => {
      mockAuthProvider.resumeAuthFromRedirect.mockReturnValue(null);
      mockStorage.getSession.mockResolvedValue(null);
      mockClient.createOrganization.mockResolvedValue({ organizationId: 'new-org-id' });
      mockClient.createWallet.mockResolvedValue({ walletId: 'app-wallet-123' });
      mockClient.getWalletAddresses.mockResolvedValue([
        { addressType: 'solana', address: 'test-address' },
      ]);

      const result = await provider.connect();

      expect(mockClient.createWallet).toHaveBeenCalled();
      expect(result.walletId).toBe('app-wallet-123');
      // Should not call authentication methods
      expect(mockAuthProvider.authenticate).not.toHaveBeenCalled();
    });

    it('should generate keypair and organization for app wallet', async () => {
      mockAuthProvider.resumeAuthFromRedirect.mockReturnValue(null);
      mockStorage.getSession.mockResolvedValue(null);
      mockClient.createOrganization.mockResolvedValue({ organizationId: 'new-org-id' });
      mockClient.createWallet.mockResolvedValue({ walletId: 'app-wallet-123' });
      mockClient.getWalletAddresses.mockResolvedValue([]);

      await provider.connect();

      expect(mockClient.createOrganization).toHaveBeenCalledWith(
        expect.stringContaining('test-org-id-'),
        expect.objectContaining({
          publicKey: 'test-public-key',
          secretKey: 'test-secret-key',
        })
      );
    });

    it('should save completed session immediately for app wallet', async () => {
      mockAuthProvider.resumeAuthFromRedirect.mockReturnValue(null);
      mockStorage.getSession.mockResolvedValue(null);
      mockClient.createOrganization.mockResolvedValue({ organizationId: 'new-org-id' });
      mockClient.createWallet.mockResolvedValue({ walletId: 'app-wallet-123' });
      mockClient.getWalletAddresses.mockResolvedValue([]);

      await provider.connect();

      expect(mockStorage.saveSession).toHaveBeenCalledWith(
        expect.objectContaining({
          walletId: 'app-wallet-123',
          status: 'completed',
          authProvider: 'app-wallet',
        })
      );
    });

    it('should fetch wallet addresses after app wallet creation', async () => {
      mockAuthProvider.resumeAuthFromRedirect.mockReturnValue(null);
      mockStorage.getSession.mockResolvedValue(null);
      mockClient.createOrganization.mockResolvedValue({ organizationId: 'new-org-id' });
      mockClient.createWallet.mockResolvedValue({ walletId: 'app-wallet-123' });
      mockClient.getWalletAddresses.mockResolvedValue([
        { addressType: 'solana', address: 'test-address' },
      ]);

      const result = await provider.connect();

      expect(mockClient.getWalletAddresses).toHaveBeenCalledWith('app-wallet-123');
      expect(result.addresses).toHaveLength(1);
    });
  });

  describe('JWT Authentication Flow', () => {
    it('should authenticate with valid JWT token', async () => {
      mockAuthProvider.resumeAuthFromRedirect.mockReturnValue(null);
      mockStorage.getSession.mockResolvedValue(null);
      mockClient.createOrganization.mockResolvedValue({ organizationId: 'new-org-id' });
      
      // Mock the core provider's JWT auth (since it's handled internally now)
      const jwtAuthSpy = jest.spyOn(provider as any, 'handleJWTAuth').mockResolvedValue({
        sessionId: 'jwt-session-id',
        walletId: 'jwt-wallet-123',
        organizationId: 'test-org-id',
        keypair: { publicKey: 'pub', secretKey: 'sec' },
        authProvider: 'jwt',
        userInfo: { sub: 'user-123' },
        status: 'completed',
        createdAt: Date.now(),
        lastUsed: Date.now(),
      });

      mockClient.getWalletAddresses.mockResolvedValue([
        { addressType: 'solana', address: 'test-address' },
      ]);

      const result = await provider.connect({
        provider: 'jwt',
        jwtToken: 'valid-jwt-token',
      });

      expect(jwtAuthSpy).toHaveBeenCalledWith(
        'new-org-id',
        expect.any(Object),
        expect.objectContaining({
          provider: 'jwt',
          jwtToken: 'valid-jwt-token',
        })
      );
      expect(result.walletId).toBe('jwt-wallet-123');
    });

    it('should create completed session after successful JWT auth', async () => {
      mockAuthProvider.resumeAuthFromRedirect.mockReturnValue(null);
      mockStorage.getSession.mockResolvedValue(null);
      mockClient.createOrganization.mockResolvedValue({ organizationId: 'new-org-id' });
      
      // Mock the core provider's JWT auth
      jest.spyOn(provider as any, 'handleJWTAuth').mockResolvedValue({
        sessionId: 'jwt-session-id',
        walletId: 'jwt-wallet-123',
        organizationId: 'test-org-id',
        keypair: { publicKey: 'pub', secretKey: 'sec' },
        authProvider: 'jwt',
        userInfo: { sub: 'user-123' },
        status: 'completed',
        createdAt: Date.now(),
        lastUsed: Date.now(),
      });

      mockClient.getWalletAddresses.mockResolvedValue([]);

      await provider.connect({
        provider: 'jwt',
        jwtToken: 'valid-jwt-token',
      });

      expect(mockStorage.saveSession).toHaveBeenCalledWith(
        expect.objectContaining({
          walletId: 'jwt-wallet-123',
          status: 'completed',
          authProvider: 'jwt',
          userInfo: { sub: 'user-123' },
        })
      );
    });

    it('should validate JWT token is present before attempting auth', async () => {
      mockAuthProvider.resumeAuthFromRedirect.mockReturnValue(null);
      mockStorage.getSession.mockResolvedValue(null);

      await expect(
        provider.connect({
          provider: 'jwt',
          // Missing jwtToken
        })
      ).rejects.toThrow('JWT token is required when using JWT authentication');
    });

    it('should throw error when JWT token is missing for JWT provider', async () => {
      mockAuthProvider.resumeAuthFromRedirect.mockReturnValue(null);
      mockStorage.getSession.mockResolvedValue(null);

      await expect(
        provider.connect({
          provider: 'jwt',
        })
      ).rejects.toThrow('JWT token is required when using JWT authentication');
    });

    it('should handle JWT authentication failure gracefully', async () => {
      mockAuthProvider.resumeAuthFromRedirect.mockReturnValue(null);
      mockStorage.getSession.mockResolvedValue(null);
      mockClient.createOrganization.mockResolvedValue({ organizationId: 'new-org-id' });
      
      // Mock JWT auth to throw error
      jest.spyOn(provider as any, 'handleJWTAuth').mockRejectedValue(new Error('Invalid JWT token'));

      await expect(
        provider.connect({
          provider: 'jwt',
          jwtToken: 'invalid-jwt-token',
        })
      ).rejects.toThrow('JWT Authentication error: Invalid JWT token');
    });
  });

  describe('Apple OAuth Flow', () => {
    it('should initiate redirect when connecting with provider apple', async () => {
      mockStorage.getSession.mockResolvedValue(null);
      mockAuthProvider.resumeAuthFromRedirect.mockReturnValue(null);
      mockClient.createOrganization.mockResolvedValue({ organizationId: 'new-org-id' });

      await provider.connect({ provider: 'apple' });

      expect(mockAuthProvider.authenticate).toHaveBeenCalledWith(
        expect.objectContaining({
          provider: 'apple',
          redirectUrl: config.authOptions?.redirectUrl,
        })
      );
    });

    it('should save temporary session before apple redirect', async () => {
      mockStorage.getSession.mockResolvedValue(null);
      mockAuthProvider.resumeAuthFromRedirect.mockReturnValue(null);
      mockClient.createOrganization.mockResolvedValue({ organizationId: 'new-org-id' });

      await provider.connect({ provider: 'apple' });

      expect(mockStorage.saveSession).toHaveBeenCalledWith(
        expect.objectContaining({
          status: 'pending',
          authProvider: 'phantom-connect',
          userInfo: { provider: 'apple' },
        })
      );
    });

    it('should update session timestamp before apple redirect to prevent race condition', async () => {
      mockStorage.getSession.mockResolvedValue(null);
      mockAuthProvider.resumeAuthFromRedirect.mockReturnValue(null);
      mockClient.createOrganization.mockResolvedValue({ organizationId: 'new-org-id' });

      const saveSpy = jest.spyOn(mockStorage, 'saveSession');
      await provider.connect({ provider: 'apple' });

      // Should be called once for redirect flow (includes timestamp update before redirect)
      expect(saveSpy).toHaveBeenCalledTimes(1);
      const calls = saveSpy.mock.calls;
      expect(calls[0][0]).toMatchObject({
        lastUsed: expect.any(Number),
        status: 'pending',
      });
    });
  });

  describe('Default Phantom Connect Flow', () => {
    it('should initiate phantom connect redirect when no specific provider given', async () => {
      mockStorage.getSession.mockResolvedValue(null);
      mockAuthProvider.resumeAuthFromRedirect.mockReturnValue(null);
      mockClient.createOrganization.mockResolvedValue({ organizationId: 'new-org-id' });

      await provider.connect();

      expect(mockAuthProvider.authenticate).toHaveBeenCalledWith(
        expect.objectContaining({
          provider: undefined,
          redirectUrl: config.authOptions?.redirectUrl,
        })
      );
    });

    it('should save temporary session before phantom connect redirect', async () => {
      mockStorage.getSession.mockResolvedValue(null);
      mockAuthProvider.resumeAuthFromRedirect.mockReturnValue(null);
      mockClient.createOrganization.mockResolvedValue({ organizationId: 'new-org-id' });

      await provider.connect();

      expect(mockStorage.saveSession).toHaveBeenCalledWith(
        expect.objectContaining({
          status: 'pending',
          authProvider: 'phantom-connect',
          userInfo: { provider: undefined },
        })
      );
    });

    it('should handle phantom connect authentication flow', async () => {
      mockStorage.getSession.mockResolvedValue(null);
      mockAuthProvider.resumeAuthFromRedirect.mockReturnValue(null);
      mockClient.createOrganization.mockResolvedValue({ organizationId: 'new-org-id' });

      await provider.connect();

      expect(mockAuthProvider.authenticate).toHaveBeenCalledWith(
        expect.objectContaining({
          organizationId: 'new-org-id',
          parentOrganizationId: 'test-org-id',
          sessionId: expect.any(String),
        })
      );
    });
  });

  describe('Session Validation Edge Cases', () => {
    it('should clear session when status is pending but no sessionId in URL', async () => {
      mockAuthProvider.resumeAuthFromRedirect.mockReturnValue(null);
      // Mock URL params accessor to return null (no sessionId in URL)
      mockURLParamsAccessor.getParam.mockReturnValue(null);

      const existingSession: Session = {
        sessionId: 'test-session-id',
        walletId: 'temp-wallet',
        organizationId: 'org-123',
        keypair: { publicKey: 'pub', secretKey: 'sec' },
        authProvider: 'phantom-connect',
        userInfo: {},
        status: 'pending', // Started but no URL sessionId
        createdAt: Date.now(),
        lastUsed: Date.now(),
      };
      mockStorage.getSession.mockResolvedValue(existingSession);
      mockClient.createOrganization.mockResolvedValue({ organizationId: 'new-org-id' });

      await provider.connect();

      expect(mockStorage.clearSession).toHaveBeenCalled();
    });

    it('should validate existing completed sessions without modification', async () => {
      mockAuthProvider.resumeAuthFromRedirect.mockReturnValue(null);

      const completedSession: Session = {
        sessionId: 'test-session-id',
        walletId: 'wallet-123',
        organizationId: 'org-123',
        keypair: { publicKey: 'pub', secretKey: 'sec' },
        authProvider: 'jwt',
        userInfo: {},
        status: 'completed',
        createdAt: Date.now(),
        lastUsed: Date.now(),
      };
      mockStorage.getSession.mockResolvedValue(completedSession);
      mockClient.getWalletAddresses.mockResolvedValue([
        { addressType: 'solana', address: 'test-address' },
      ]);

      const result = await provider.connect();

      expect(mockStorage.clearSession).not.toHaveBeenCalled();
      expect(result.walletId).toBe('wallet-123');
    });

    it('should handle concurrent session operations safely', async () => {
      mockAuthProvider.resumeAuthFromRedirect.mockReturnValue(null);

      const completedSession: Session = {
        sessionId: 'test-session-id',
        walletId: 'wallet-123',
        organizationId: 'org-123',
        keypair: { publicKey: 'pub', secretKey: 'sec' },
        authProvider: 'jwt',
        userInfo: {},
        status: 'completed',
        createdAt: Date.now(),
        lastUsed: Date.now(),
      };
      mockStorage.getSession.mockResolvedValue(completedSession);
      mockClient.getWalletAddresses.mockResolvedValue([]);

      // Simulate concurrent calls
      const promise1 = provider.connect();
      const promise2 = provider.connect();

      const results = await Promise.all([promise1, promise2]);

      expect(results[0].walletId).toBe('wallet-123');
      expect(results[1].walletId).toBe('wallet-123');
    });
  });

  describe('Error Handling', () => {
    it('should handle network errors during authentication gracefully', async () => {
      mockAuthProvider.resumeAuthFromRedirect.mockReturnValue(null);
      mockStorage.getSession.mockResolvedValue(null);
      mockClient.createOrganization.mockRejectedValue(new Error('network timeout'));

      await expect(provider.connect()).rejects.toThrow(/network/i);
    });

    it('should provide specific error messages for different failure types', async () => {
      mockAuthProvider.resumeAuthFromRedirect.mockReturnValue(null);
      mockStorage.getSession.mockResolvedValue(null);
      mockClient.createOrganization.mockRejectedValue(new Error('IndexedDB access denied'));

      await expect(provider.connect()).rejects.toThrow(
        'Storage error: Unable to access browser storage. Please ensure storage is available and try again.'
      );
    });

    it('should clean up state on authentication failures', async () => {
      mockAuthProvider.resumeAuthFromRedirect.mockReturnValue(null);
      mockStorage.getSession.mockResolvedValue(null);
      mockClient.createOrganization.mockResolvedValue({ organizationId: 'new-org-id' });
      
      // Mock JWT auth to succeed but getWalletAddresses to fail
      jest.spyOn(provider as any, 'handleJWTAuth').mockResolvedValue({
        sessionId: 'jwt-session-id',
        walletId: 'jwt-wallet-123',
        organizationId: 'test-org-id',
        keypair: { publicKey: 'pub', secretKey: 'sec' },
        authProvider: 'jwt',
        userInfo: { sub: 'user-123' },
        status: 'completed',
        createdAt: Date.now(),
        lastUsed: Date.now(),
      });
      
      // Make getWalletAddresses fail consistently to trigger cleanup
      mockClient.getWalletAddresses
        .mockRejectedValueOnce(new Error('Wallet not found'))
        .mockRejectedValueOnce(new Error('Wallet not found'))
        .mockRejectedValueOnce(new Error('Wallet not found'));

      try {
        await provider.connect({ provider: 'jwt', jwtToken: 'test-token' });
      } catch (error) {
        // Expected to fail after retries
      }

      // Should have attempted to clear session during cleanup in getAndFilterWalletAddresses
      expect(mockStorage.clearSession).toHaveBeenCalled();
    });
  });

  describe('Provider State Management', () => {
    it('should return correct connection status', () => {
      expect(provider.isConnected()).toBe(false);
      
      // Mock connected state
      (provider as any).client = mockClient;
      (provider as any).walletId = 'test-wallet-id';
      
      expect(provider.isConnected()).toBe(true);
    });

    it('should return addresses when connected', async () => {
      mockAuthProvider.resumeAuthFromRedirect.mockReturnValue(null);

      const completedSession: Session = {
        sessionId: 'test-session-id',
        walletId: 'wallet-123',
        organizationId: 'org-123',
        keypair: { publicKey: 'pub', secretKey: 'sec' },
        authProvider: 'jwt',
        userInfo: {},
        status: 'completed',
        createdAt: Date.now(),
        lastUsed: Date.now(),
      };
      mockStorage.getSession.mockResolvedValue(completedSession);
      mockClient.getWalletAddresses.mockResolvedValue([
        { addressType: 'solana', address: 'test-address' },
      ]);

      await provider.connect();
      
      const addresses = provider.getAddresses();
      expect(addresses).toHaveLength(1);
      expect(addresses[0].address).toBe('test-address');
    });

    it('should clear state on disconnect', async () => {
      // Connect first
      mockAuthProvider.resumeAuthFromRedirect.mockReturnValue(null);
      const completedSession: Session = {
        sessionId: 'test-session-id',
        walletId: 'wallet-123',
        organizationId: 'org-123',
        keypair: { publicKey: 'pub', secretKey: 'sec' },
        authProvider: 'jwt',
        userInfo: {},
        status: 'completed',
        createdAt: Date.now(),
        lastUsed: Date.now(),
      };
      mockStorage.getSession.mockResolvedValue(completedSession);
      mockClient.getWalletAddresses.mockResolvedValue([]);

      await provider.connect();
      expect(provider.isConnected()).toBe(true);

      // Disconnect
      await provider.disconnect();
      
      expect(mockStorage.clearSession).toHaveBeenCalled();
      expect(provider.isConnected()).toBe(false);
      expect(provider.getAddresses()).toHaveLength(0);
    });
  });
});