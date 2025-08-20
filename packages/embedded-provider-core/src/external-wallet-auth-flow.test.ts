import { EmbeddedProvider } from "./embedded-provider";
import type { EmbeddedProviderConfig } from "./types";
import type {
  PlatformAdapter,
  DebugLogger,
  Session,
  EmbeddedStorage,
  AuthProvider,
  URLParamsAccessor,
} from "./interfaces";
import type { StamperWithKeyManagement } from "@phantom/sdk-types";
import { PhantomClient } from "@phantom/client";
import { PhantomWalletStamper } from "@phantom/phantom-wallet-stamper";

// Mock dependencies
jest.mock("@phantom/client");
jest.mock("@phantom/phantom-wallet-stamper");

// Cast mocked classes for type safety
const mockedPhantomClient = jest.mocked(PhantomClient);
const mockedPhantomWalletStamper = jest.mocked(PhantomWalletStamper);

describe("EmbeddedProvider External Wallet Auth Flow", () => {
  let provider: EmbeddedProvider;
  let config: EmbeddedProviderConfig;
  let mockPlatform: PlatformAdapter;
  let mockLogger: DebugLogger;
  let mockStorage: jest.Mocked<EmbeddedStorage>;
  let mockAuthProvider: jest.Mocked<AuthProvider>;
  let mockURLParamsAccessor: jest.Mocked<URLParamsAccessor>;
  let mockLocalStamper: jest.Mocked<StamperWithKeyManagement>;
  let mockPhantomClient: jest.Mocked<PhantomClient>;
  let mockPhantomStamper: jest.Mocked<PhantomWalletStamper>;

  beforeEach(() => {
    // Reset mocks
    jest.clearAllMocks();

    // Setup config for user-wallet with external wallet auth
    config = {
      apiBaseUrl: "https://api.example.com",
      organizationId: "test-org-id",
      embeddedWalletType: "user-wallet", // user-wallet type to enable auth routing
      addressTypes: ["solana", "ethereum"],
      solanaProvider: "web3js",
    };

    // Mock storage
    mockStorage = {
      getSession: jest.fn(),
      saveSession: jest.fn(),
      clearSession: jest.fn(),
    };

    // Mock auth provider (not used for external wallet)
    mockAuthProvider = {
      authenticate: jest.fn(),
      resumeAuthFromRedirect: jest.fn(),
    };

    // Mock URL params accessor
    mockURLParamsAccessor = {
      getParam: jest.fn().mockReturnValue(null),
    };

    // Mock local platform stamper (e.g., IndexedDB on browser, SecureStore on React Native)
    mockLocalStamper = {
      init: jest.fn().mockResolvedValue({ 
        keyId: "local-key-id", 
        publicKey: "22222222222222222222222222222222" 
      }),
      sign: jest.fn().mockResolvedValue("local-signature"),
      stamp: jest.fn().mockResolvedValue("local-stamp"),
      getKeyInfo: jest.fn().mockReturnValue({ 
        keyId: "local-key-id", 
        publicKey: "22222222222222222222222222222222" 
      }),
      resetKeyPair: jest.fn().mockResolvedValue({ 
        keyId: "local-key-id", 
        publicKey: "22222222222222222222222222222222" 
      }),
      clear: jest.fn().mockResolvedValue(undefined),
      algorithm: "ed25519",
      type: "PKI",
    };

    // Setup mock platform adapter
    mockPlatform = {
      name: "test-platform",
      storage: mockStorage,
      authProvider: mockAuthProvider,
      urlParamsAccessor: mockURLParamsAccessor,
      stamper: mockLocalStamper,
    };

    // Setup mock logger
    mockLogger = {
      info: jest.fn(),
      warn: jest.fn(),
      error: jest.fn(),
      log: jest.fn(),
    };

    // Mock PhantomClient
    mockPhantomClient = {
      createOrganization: jest.fn(),
      getOrCreatePhantomOrganization: jest.fn(),
      getOrCreateWalletWithTag: jest.fn(),
      createAuthenticator: jest.fn(),
      getWalletAddresses: jest.fn(),
      signMessage: jest.fn(),
      signAndSendTransaction: jest.fn(),
    } as any;
    mockedPhantomClient.mockImplementation(() => mockPhantomClient);

    // Mock PhantomWalletStamper
    mockPhantomStamper = {
      init: jest.fn().mockResolvedValue({
        keyId: "phantom-key-id",
        publicKey: "33333333333333333333333333333333"
      }),
      stamp: jest.fn().mockResolvedValue("phantom-stamp"),
      getKeyInfo: jest.fn().mockReturnValue({
        keyId: "phantom-key-id", 
        publicKey: "33333333333333333333333333333333"
      }),
      disconnect: jest.fn().mockResolvedValue(undefined),
      algorithm: "ed25519",
      type: "PKI",
    } as any;
    mockedPhantomWalletStamper.mockImplementation(() => mockPhantomStamper);

    provider = new EmbeddedProvider(config, mockPlatform, mockLogger);
  });

  // Helper function to set up common mocks for external wallet flow
  const setupExternalWalletMocks = () => {
    mockStorage.getSession.mockResolvedValue(null);
    mockAuthProvider.resumeAuthFromRedirect.mockReturnValue(null);
    
    // Mock the initial organization creation (from createOrganizationAndStamper)
    mockPhantomClient.createOrganization.mockResolvedValue({ 
      organizationId: "temp-org-id" 
    });
    // Mock external wallet specific methods
    mockPhantomClient.getOrCreatePhantomOrganization.mockResolvedValue({ 
      organizationId: "phantom-org-id" 
    });
    mockPhantomClient.getOrCreateWalletWithTag.mockResolvedValue({ 
      walletId: "external-wallet-123" 
    });
    mockPhantomClient.createAuthenticator.mockResolvedValue({ success: true });
    mockPhantomClient.getWalletAddresses.mockResolvedValue([
      { addressType: "solana", address: "phantom-solana-address" }
    ]);
  };

  describe("External Wallet Connection Flow", () => {
    it("should connect to Phantom wallet when authOptions.provider is external_wallet", async () => {
      setupExternalWalletMocks();

      const result = await provider.connect({ provider: "external_wallet" });

      expect(PhantomWalletStamper).toHaveBeenCalledWith({
        platform: "auto",
        timeout: 30000,
      });
      expect(mockPhantomStamper.init).toHaveBeenCalled();
      expect(result.walletId).toBe("external-wallet-123");
      expect(result.status).toBe("completed");
    });

    it("should get or create Phantom organization using external wallet public key", async () => {
      setupExternalWalletMocks();

      await provider.connect({ provider: "external_wallet" });

      expect(mockPhantomClient.getOrCreatePhantomOrganization).toHaveBeenCalledWith({
        publicKey: expect.any(String), // base64url encoded phantom public key
      });
    });

    it("should get or create wallet with tag using Phantom organization", async () => {
      setupExternalWalletMocks();

      await provider.connect({ provider: "external_wallet" });

      expect(mockPhantomClient.getOrCreateWalletWithTag).toHaveBeenCalledWith({
        organizationId: "phantom-org-id",
        tag: "external-wallet-33333333",
        derivationPaths: [
          "m/44'/501'/0'/0'", // Solana
          "m/44'/60'/0'/0/0", // Ethereum
          "m/84'/0'/0'/0/0",  // Bitcoin
        ],
        walletName: "External Wallet 33333333",
      });
    });

    it("should initialize local platform stamper for subsequent operations", async () => {
      setupExternalWalletMocks();

      await provider.connect({ provider: "external_wallet" });

      expect(mockLocalStamper.init).toHaveBeenCalled();
    });

    it("should add local stamper as authenticator to Phantom organization", async () => {
      setupExternalWalletMocks();

      await provider.connect({ provider: "external_wallet" });

      expect(mockPhantomClient.createAuthenticator).toHaveBeenCalledWith({
        organizationId: "phantom-org-id",
        username: "user-phantom-33333333",
        authenticatorName: "local-local-key-id",
        authenticator: {
          authenticatorName: "local-local-key-id",
          authenticatorKind: "keypair",
          publicKey: expect.any(String), // base64url encoded local public key
          algorithm: "Ed25519",
        },
      });
    });

    it("should save completed session with external wallet details", async () => {
      setupExternalWalletMocks();

      await provider.connect({ provider: "external_wallet" });

      expect(mockStorage.saveSession).toHaveBeenCalledWith(
        expect.objectContaining({
          walletId: "external-wallet-123",
          organizationId: "phantom-org-id",
          stamperInfo: {
            keyId: "local-key-id",
            publicKey: "22222222222222222222222222222222",
          },
          authProvider: "external-wallet",
          userInfo: {
            embeddedWalletType: "app-wallet",
            authProvider: "external_wallet",
            phantomPublicKey: "33333333333333333333333333333333",
          },
          status: "completed",
        }),
      );
    });

    it("should use local stamper for subsequent operations after external wallet setup", async () => {
      setupExternalWalletMocks();
      // Override the default mock to return addresses
      mockPhantomClient.getWalletAddresses.mockResolvedValue([
        { addressType: "solana", address: "test-solana-address" }
      ]);

      const result = await provider.connect({ provider: "external_wallet" });

      // PhantomClient should be called for the final client setup
      expect(PhantomClient).toHaveBeenCalled();
      expect(result.addresses).toHaveLength(1);
    });
  });

  describe("External Wallet Error Handling", () => {
    it("should handle Phantom wallet not available error", async () => {
      mockStorage.getSession.mockResolvedValue(null);
      mockAuthProvider.resumeAuthFromRedirect.mockReturnValue(null);
      mockPhantomClient.createOrganization.mockResolvedValue({ organizationId: "temp-org-id" });
      mockPhantomStamper.init.mockRejectedValue(new Error("Phantom wallet extension not found"));

      await expect(provider.connect({ provider: "external_wallet" })).rejects.toThrow(/Phantom wallet/);
    });

    it("should handle organization creation failure", async () => {
      mockStorage.getSession.mockResolvedValue(null);
      mockAuthProvider.resumeAuthFromRedirect.mockReturnValue(null);
      mockPhantomClient.createOrganization.mockResolvedValue({ organizationId: "temp-org-id" });
      mockPhantomClient.getOrCreatePhantomOrganization.mockRejectedValue(
        new Error("Failed to create Phantom organization")
      );

      await expect(provider.connect({ provider: "external_wallet" })).rejects.toThrow(/organization/);
    });

    it("should handle wallet creation failure", async () => {
      mockStorage.getSession.mockResolvedValue(null);
      mockAuthProvider.resumeAuthFromRedirect.mockReturnValue(null);
      mockPhantomClient.createOrganization.mockResolvedValue({ organizationId: "temp-org-id" });
      mockPhantomClient.getOrCreatePhantomOrganization.mockResolvedValue({ organizationId: "phantom-org-id" });
      mockPhantomClient.getOrCreateWalletWithTag.mockRejectedValue(
        new Error("Failed to create external wallet")
      );

      await expect(provider.connect({ provider: "external_wallet" })).rejects.toThrow(/wallet/);
    });

    it("should handle local stamper initialization failure", async () => {
      mockStorage.getSession.mockResolvedValue(null);
      mockAuthProvider.resumeAuthFromRedirect.mockReturnValue(null);
      mockPhantomClient.createOrganization.mockResolvedValue({ organizationId: "temp-org-id" });
      mockPhantomClient.getOrCreatePhantomOrganization.mockResolvedValue({ organizationId: "phantom-org-id" });
      mockPhantomClient.getOrCreateWalletWithTag.mockResolvedValue({ walletId: "external-wallet-123" });
      mockLocalStamper.init.mockRejectedValue(new Error("Storage not available"));

      await expect(provider.connect({ provider: "external_wallet" })).rejects.toThrow(/Storage/);
    });

    it("should handle authenticator creation failure", async () => {
      mockStorage.getSession.mockResolvedValue(null);
      mockAuthProvider.resumeAuthFromRedirect.mockReturnValue(null);
      mockPhantomClient.createOrganization.mockResolvedValue({ organizationId: "temp-org-id" });
      mockPhantomClient.getOrCreatePhantomOrganization.mockResolvedValue({ organizationId: "phantom-org-id" });
      mockPhantomClient.getOrCreateWalletWithTag.mockResolvedValue({ walletId: "external-wallet-123" });
      mockPhantomClient.createAuthenticator.mockRejectedValue(
        new Error("Failed to add authenticator")
      );

      await expect(provider.connect({ provider: "external_wallet" })).rejects.toThrow(/authenticator/);
    });
  });

  describe("External Wallet Session Management", () => {
    it("should resume external wallet session if already connected", async () => {
      const existingSession: Session = {
        sessionId: "external-session-id",
        walletId: "external-wallet-123",
        organizationId: "phantom-org-id",
        stamperInfo: {
          keyId: "local-key-id",
          publicKey: "22222222222222222222222222222222",
        },
        authProvider: "external-wallet",
        userInfo: {
          embeddedWalletType: "app-wallet",
          authProvider: "external_wallet",
          phantomPublicKey: "33333333333333333333333333333333",
        },
        status: "completed",
        createdAt: Date.now(),
        lastUsed: Date.now(),
      };
      
      mockStorage.getSession.mockResolvedValue(existingSession);
      mockAuthProvider.resumeAuthFromRedirect.mockReturnValue(null);
      mockPhantomClient.getWalletAddresses.mockResolvedValue([
        { addressType: "solana", address: "test-solana-address" }
      ]);

      const result = await provider.connect();

      // Should not recreate external wallet connection
      expect(PhantomWalletStamper).not.toHaveBeenCalled();
      expect(result.walletId).toBe("external-wallet-123");
      expect(result.status).toBe("completed");
    });

    it("should update session timestamp when resuming external wallet", async () => {
      const existingSession: Session = {
        sessionId: "external-session-id",
        walletId: "external-wallet-123",
        organizationId: "phantom-org-id",
        stamperInfo: {
          keyId: "local-key-id",
          publicKey: "22222222222222222222222222222222",
        },
        authProvider: "external-wallet",
        userInfo: {
          embeddedWalletType: "app-wallet",
          authProvider: "external_wallet",
          phantomPublicKey: "33333333333333333333333333333333",
        },
        status: "completed",
        createdAt: Date.now(),
        lastUsed: Date.now() - 60000, // 1 minute ago
      };
      
      mockStorage.getSession.mockResolvedValue(existingSession);
      mockAuthProvider.resumeAuthFromRedirect.mockReturnValue(null);
      mockPhantomClient.getWalletAddresses.mockResolvedValue([]);

      const originalLastUsed = existingSession.lastUsed;
      await provider.connect({ provider: "external_wallet" });

      // Session timestamp should be updated for external wallet auth
      expect(mockStorage.saveSession).toHaveBeenCalledWith(
        expect.objectContaining({
          lastUsed: expect.any(Number),
        }),
      );
      
      const savedSession = mockStorage.saveSession.mock.calls[0][0];
      expect(savedSession.lastUsed).toBeGreaterThan(originalLastUsed);
    });

    it("should disconnect external wallet and clear session", async () => {
      // Set up connected state
      const existingSession: Session = {
        sessionId: "external-session-id",
        walletId: "external-wallet-123",
        organizationId: "phantom-org-id",
        stamperInfo: {
          keyId: "local-key-id",
          publicKey: "22222222222222222222222222222222",
        },
        authProvider: "external-wallet",
        userInfo: {
          embeddedWalletType: "app-wallet",
          authProvider: "external_wallet",
          phantomPublicKey: "33333333333333333333333333333333",
        },
        status: "completed",
        createdAt: Date.now(),
        lastUsed: Date.now(),
      };
      
      mockStorage.getSession.mockResolvedValue(existingSession);
      mockAuthProvider.resumeAuthFromRedirect.mockReturnValue(null);
      mockPhantomClient.getWalletAddresses.mockResolvedValue([]);

      await provider.connect({ provider: "external_wallet" });
      expect(provider.isConnected()).toBe(true);

      await provider.disconnect();

      expect(mockStorage.clearSession).toHaveBeenCalled();
      expect(provider.isConnected()).toBe(false);
    });
  });

  describe("External Wallet Operations", () => {
    beforeEach(async () => {
      // Set up connected external wallet state
      setupExternalWalletMocks();
      mockPhantomClient.getWalletAddresses.mockResolvedValue([
        { addressType: "solana", address: "external-solana-address" }
      ]);

      await provider.connect({ provider: "external_wallet" });
    });

    it("should sign messages using local stamper after external wallet setup", async () => {
      mockPhantomClient.signMessage.mockResolvedValue("external-message-signature");

      await provider.signMessage({
        message: "test message",
        networkId: "solana:mainnet",
      });

      expect(mockPhantomClient.signMessage).toHaveBeenCalledWith({
        walletId: "external-wallet-123",
        message: expect.any(String),
        networkId: "solana:mainnet",
      });
    });

    it("should sign and send transactions using local stamper after external wallet setup", async () => {
      mockPhantomClient.signAndSendTransaction.mockResolvedValue({
        rawTransaction: "base64url-raw-transaction",
        hash: "transaction-hash",
      });

      await provider.signAndSendTransaction({
        transaction: "base64-encoded-transaction",
        networkId: "solana:mainnet",
      });

      expect(mockPhantomClient.signAndSendTransaction).toHaveBeenCalledWith({
        walletId: "external-wallet-123",
        transaction: expect.any(String),
        networkId: "solana:mainnet",
      });
    });

    it("should return addresses from external wallet", () => {
      const addresses = provider.getAddresses();
      
      expect(addresses).toHaveLength(1);
      expect(addresses[0]).toEqual({
        addressType: "solana",
        address: "external-solana-address",
      });
    });
  });

  describe("External Wallet Integration Points", () => {
    it("should create unique wallet tags based on Phantom public key", async () => {
      setupExternalWalletMocks();

      await provider.connect({ provider: "external_wallet" });

      const getOrCreateCall = mockPhantomClient.getOrCreateWalletWithTag.mock.calls[0][0];
      expect(getOrCreateCall.tag).toMatch(/^external-wallet-[a-f0-9]{8}$/);
      expect(getOrCreateCall.walletName).toMatch(/^External Wallet [a-f0-9]{8}$/);
    });

    it("should create unique authenticator names based on local stamper key ID", async () => {
      setupExternalWalletMocks();

      await provider.connect({ provider: "external_wallet" });

      const createAuthCall = mockPhantomClient.createAuthenticator.mock.calls[0][0];
      expect(createAuthCall.authenticatorName).toBe("local-local-key-id");
      expect(createAuthCall.authenticator.authenticatorName).toBe("local-local-key-id");
    });

    it("should store phantom public key in session for reference", async () => {
      setupExternalWalletMocks();

      await provider.connect({ provider: "external_wallet" });

      const saveSessionCall = mockStorage.saveSession.mock.calls[0][0];
      expect(saveSessionCall.userInfo.phantomPublicKey).toBe("33333333333333333333333333333333");
    });
  });
});