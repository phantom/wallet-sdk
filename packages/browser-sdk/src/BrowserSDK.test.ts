import { BrowserSDK } from "./BrowserSDK";
import { InjectedProvider } from "./providers/injected";
import { EmbeddedProvider } from "./providers/embedded";
import { ProviderManager } from "./ProviderManager";
import { cleanupWindowMock } from "./test-utils/mockWindow";
import { waitForPhantomExtension } from "./waitForPhantomExtension";
import { AddressType } from "@phantom/client";

// Mock parsers to prevent ESM module parsing issues
jest.mock("@phantom/parsers", () => ({
  parseMessage: jest.fn().mockReturnValue({ base64url: "mock-base64url" }),
  parseTransactionToBase64Url: jest.fn().mockResolvedValue({ base64url: "mock-base64url", originalFormat: "mock" }),
  parseSignMessageResponse: jest.fn().mockReturnValue({ signature: "mock-signature", rawSignature: "mock-raw" }),
  parseTransactionResponse: jest.fn().mockReturnValue({ 
    hash: "mock-transaction-hash", 
    rawTransaction: "mock-raw-tx",
    blockExplorer: "https://explorer.com/tx/mock-transaction-hash"
  }),
  parseSolanaTransactionSignature: jest.fn().mockReturnValue({ signature: "mock-signature", fallback: false }),
}));

// Mock the providers
jest.mock("./providers/injected");
jest.mock("./providers/embedded");
jest.mock("./ProviderManager");
jest.mock("./waitForPhantomExtension");

const MockInjectedProvider = InjectedProvider as jest.MockedClass<typeof InjectedProvider>;
const MockEmbeddedProvider = EmbeddedProvider as jest.MockedClass<typeof EmbeddedProvider>;
const MockProviderManager = ProviderManager as jest.MockedClass<typeof ProviderManager>;

describe("BrowserSDK", () => {
  let sdk: BrowserSDK;

  beforeEach(() => {
    jest.clearAllMocks();
    cleanupWindowMock();
  });

  afterEach(() => {
    cleanupWindowMock();
  });

  describe("constructor", () => {
    it("should create SDK with unified configuration", () => {
      sdk = new BrowserSDK({
        appId: "app-123",
        addressTypes: [AddressType.solana],
        apiBaseUrl: "https://api.phantom.app/v1/wallets",
        authOptions: {
          authUrl: "https://auth.phantom.com",
        },
      });

      expect(MockProviderManager).toHaveBeenCalledWith({
        appId: "app-123",
        addressTypes: [AddressType.solana],
        apiBaseUrl: "https://api.phantom.app/v1/wallets",
        authOptions: {
          authUrl: "https://auth.phantom.com",
        },
      });
    });

    it("should use custom embeddedWalletType", () => {
      sdk = new BrowserSDK({
        appId: "app-123",
        addressTypes: [AddressType.solana],
        embeddedWalletType: "app-wallet",
        authOptions: {
          authUrl: "https://auth.phantom.com",
        },
      });

      expect(MockProviderManager).toHaveBeenCalledWith({
        appId: "app-123",
        addressTypes: [AddressType.solana],
        embeddedWalletType: "app-wallet",
        authOptions: {
          authUrl: "https://auth.phantom.com",
        },
      });
    });

    it("should throw error without required appId", () => {
      expect(() => {
        new BrowserSDK({
          addressTypes: [AddressType.solana],
        } as any);
      }).toThrow("appId is required for BrowserSDK initialization");
    });

    it("should throw error for invalid embeddedWalletType", () => {
      expect(() => {
        new BrowserSDK({
          appId: "app-123",
          addressTypes: [AddressType.solana],
          embeddedWalletType: "invalid" as any,
        });
      }).toThrow('Invalid embeddedWalletType: invalid. Must be "app-wallet" or "user-wallet".');
    });
  });

  describe("provider methods", () => {
    let mockProvider: any;
    let mockProviderManager: any;

    beforeEach(() => {
      mockProvider = {
        connect: jest.fn(),
        disconnect: jest.fn(),
        getAddresses: jest.fn(),
        isConnected: jest.fn(),
        solana: {
          signMessage: jest.fn(),
          signAndSendTransaction: jest.fn(),
        },
        ethereum: {
          signPersonalMessage: jest.fn(),
          sendTransaction: jest.fn(),
        },
      };

      mockProviderManager = {
        getCurrentProvider: jest.fn().mockReturnValue(mockProvider),
        connect: jest.fn(),
        disconnect: jest.fn(),
        getAddresses: jest.fn(),
        isConnected: jest.fn(),
        getWalletId: jest.fn(),
        switchProvider: jest.fn(),
        getCurrentProviderInfo: jest.fn(),
        on: jest.fn(),
        off: jest.fn(),
      };

      MockProviderManager.mockImplementation(() => mockProviderManager);

      sdk = new BrowserSDK({
        appId: "app-123",
        addressTypes: [AddressType.solana],
      });
    });

    describe("connect", () => {
      it("should call provider manager connect", async () => {
        const mockResult = {
          addresses: [
            {
              addressType: AddressType.solana,
              address: "test-address",
            },
          ],
        };
        mockProviderManager.connect.mockResolvedValue(mockResult);

        const result = await sdk.connect();

        expect(mockProviderManager.connect).toHaveBeenCalled();
        expect(result).toEqual(mockResult);
      });

      it("should switch provider if providerType is specified", async () => {
        const mockResult = { addresses: [] };
        mockProviderManager.connect.mockResolvedValue(mockResult);
        mockProviderManager.getCurrentProviderInfo.mockReturnValue({ type: "embedded" });

        await sdk.connect({ providerType: "injected" });

        expect(mockProviderManager.switchProvider).toHaveBeenCalledWith("injected");
        expect(mockProviderManager.connect).toHaveBeenCalled();
      });
    });

    describe("disconnect", () => {
      it("should call provider manager disconnect", async () => {
        mockProviderManager.disconnect.mockResolvedValue(undefined);

        await sdk.disconnect();

        expect(mockProviderManager.disconnect).toHaveBeenCalled();
      });
    });

    describe("signMessage", () => {
      it("should call Solana chain signMessage", async () => {
        const mockSignature = { signature: "mockSignature", rawSignature: "mockRaw" };
        mockProvider.solana.signMessage.mockResolvedValue(mockSignature);

        const result = await sdk.solana.signMessage("test-message");

        expect(mockProvider.solana.signMessage).toHaveBeenCalledWith("test-message");
        expect(result).toBe(mockSignature);
      });
    });

    describe("signAndSendTransaction", () => {
      it("should call Solana chain signAndSendTransaction", async () => {
        const mockResult = { rawTransaction: "mockTxHash", hash: "mockHash" };
        mockProvider.solana.signAndSendTransaction.mockResolvedValue(mockResult);

        const mockTransaction = { instructions: [] };
        const result = await sdk.solana.signAndSendTransaction(mockTransaction);

        expect(mockProvider.solana.signAndSendTransaction).toHaveBeenCalledWith(mockTransaction);
        expect(result).toEqual(mockResult);
      });

      it("should call Ethereum chain sendTransaction", async () => {
        const mockResult = { rawTransaction: "mockTxHash", hash: "0xmockHash" };
        mockProvider.ethereum.sendTransaction.mockResolvedValue(mockResult);

        const mockTransaction = { to: "0x123", value: "1000000000000000000" };
        const result = await sdk.ethereum.sendTransaction(mockTransaction);

        expect(mockProvider.ethereum.sendTransaction).toHaveBeenCalledWith(mockTransaction);
        expect(result).toEqual(mockResult);
      });
    });

    describe("getAddresses", () => {
      it("should call provider manager getAddresses", () => {
        const mockAddresses = [
          {
            addressType: AddressType.ethereum,
            address: "0x123",
          },
        ];
        mockProviderManager.getAddresses.mockReturnValue(mockAddresses);

        const result = sdk.getAddresses();

        expect(mockProviderManager.getAddresses).toHaveBeenCalled();
        expect(result).toEqual(mockAddresses);
      });
    });

    describe("isConnected", () => {
      it("should call provider manager isConnected", () => {
        mockProviderManager.isConnected.mockReturnValue(true);

        const result = sdk.isConnected();

        expect(mockProviderManager.isConnected).toHaveBeenCalled();
        expect(result).toBe(true);
      });
    });

    describe("getWalletId", () => {
      it("should call provider manager getWalletId", () => {
        mockProviderManager.getWalletId.mockReturnValue("wallet-123");

        const result = sdk.getWalletId();

        expect(mockProviderManager.getWalletId).toHaveBeenCalled();
        expect(result).toBe("wallet-123");
      });
    });

    describe("switchProvider", () => {
      it("should call provider manager switchProvider", async () => {
        mockProviderManager.switchProvider.mockResolvedValue(undefined);

        await sdk.switchProvider("injected");

        expect(mockProviderManager.switchProvider).toHaveBeenCalledWith("injected", undefined);
      });

      it("should pass options to provider manager", async () => {
        mockProviderManager.switchProvider.mockResolvedValue(undefined);
        const options = { embeddedWalletType: "app-wallet" as const };

        await sdk.switchProvider("embedded", options);

        expect(mockProviderManager.switchProvider).toHaveBeenCalledWith("embedded", options);
      });
    });

    describe("getCurrentProviderInfo", () => {
      it("should call provider manager getCurrentProviderInfo", () => {
        const mockInfo = { type: "embedded" as const, embeddedWalletType: "user-wallet" as const };
        mockProviderManager.getCurrentProviderInfo.mockReturnValue(mockInfo);

        const result = sdk.getCurrentProviderInfo();

        expect(mockProviderManager.getCurrentProviderInfo).toHaveBeenCalled();
        expect(result).toEqual(mockInfo);
      });
    });
  });

  describe("autoConnect", () => {
    let mockProviderManager: any;
    let mockEmbeddedProvider: any;
    let mockInjectedProvider: any;

    beforeEach(() => {
      // Mock BrowserSDK.isPhantomInstalled static method
      jest.spyOn(BrowserSDK, 'isPhantomInstalled').mockResolvedValue(false);

      mockEmbeddedProvider = {
        getSessionRecoveryInfo: jest.fn(),
        autoConnect: jest.fn(),
      };

      mockInjectedProvider = {
        autoConnect: jest.fn(),
      };

      mockProviderManager = {
        getCurrentProvider: jest.fn(),
        switchProvider: jest.fn(),
        connect: jest.fn(),
        disconnect: jest.fn(),
        getAddresses: jest.fn(),
        isConnected: jest.fn().mockReturnValue(false),
        getWalletId: jest.fn(),
        getCurrentProviderInfo: jest.fn(),
        on: jest.fn(),
        off: jest.fn(),
      };

      MockProviderManager.mockImplementation(() => mockProviderManager);

      sdk = new BrowserSDK({
        appId: "app-123",
        addressTypes: [AddressType.solana],
      });
    });

    afterEach(() => {
      jest.restoreAllMocks();
    });

    it("should auto-connect with embedded provider if session can be recovered", async () => {
      // Setup: embedded provider can recover session
      mockProviderManager.switchProvider.mockResolvedValue(undefined);
      mockProviderManager.getCurrentProvider
        .mockReturnValueOnce(mockEmbeddedProvider)
        .mockReturnValueOnce(mockEmbeddedProvider);
      
      mockEmbeddedProvider.getSessionRecoveryInfo.mockResolvedValue({
        canAutoRecover: true,
        sessionStatus: "completed",
        hasUrlParams: false,
        hasSession: true,
      });
      
      mockEmbeddedProvider.autoConnect.mockResolvedValue(undefined);
      mockProviderManager.isConnected.mockReturnValue(true);

      await sdk.autoConnect();

      expect(mockProviderManager.switchProvider).toHaveBeenCalledWith("embedded");
      expect(mockEmbeddedProvider.autoConnect).toHaveBeenCalled();
    });

    it("should auto-connect with injected provider if extension is available and no session", async () => {
      // Setup: extension available, no recoverable session
      jest.spyOn(BrowserSDK, 'isPhantomInstalled').mockResolvedValue(true);
      
      mockProviderManager.switchProvider.mockResolvedValue(undefined);
      mockProviderManager.getCurrentProvider
        .mockReturnValueOnce(mockEmbeddedProvider)
        .mockReturnValueOnce(mockInjectedProvider);
      
      mockEmbeddedProvider.getSessionRecoveryInfo.mockResolvedValue({
        canAutoRecover: false,
        sessionStatus: null,
        hasUrlParams: false,
        hasSession: false,
      });
      
      mockInjectedProvider.autoConnect.mockResolvedValue(undefined);
      mockProviderManager.isConnected.mockReturnValue(true);

      await sdk.autoConnect();

      expect(mockProviderManager.switchProvider).toHaveBeenNthCalledWith(1, "embedded");
      expect(mockProviderManager.switchProvider).toHaveBeenNthCalledWith(2, "injected");
      expect(mockInjectedProvider.autoConnect).toHaveBeenCalled();
    });

    it("should not auto-connect if no suitable provider is available", async () => {
      // Setup: no extension, no recoverable session
      jest.spyOn(BrowserSDK, 'isPhantomInstalled').mockResolvedValue(false);
      
      mockProviderManager.switchProvider.mockResolvedValue(undefined);
      mockProviderManager.getCurrentProvider.mockReturnValue(mockEmbeddedProvider);
      
      mockEmbeddedProvider.getSessionRecoveryInfo.mockResolvedValue({
        canAutoRecover: false,
        sessionStatus: null,
        hasUrlParams: false,
        hasSession: false,
      });

      await sdk.autoConnect();

      expect(mockProviderManager.switchProvider).toHaveBeenCalledWith("embedded");
      expect(mockEmbeddedProvider.autoConnect).not.toHaveBeenCalled();
      expect(mockInjectedProvider.autoConnect).not.toHaveBeenCalled();
    });

    it("should handle errors gracefully without throwing", async () => {
      // Setup: embedded provider throws error
      mockProviderManager.switchProvider.mockRejectedValue(new Error("Provider switch failed"));

      // Should not throw
      await expect(sdk.autoConnect()).resolves.not.toThrow();
    });

    it("should prioritize embedded provider with pending URL params", async () => {
      // Setup: embedded provider has pending session with URL params
      mockProviderManager.switchProvider.mockResolvedValue(undefined);
      mockProviderManager.getCurrentProvider
        .mockReturnValueOnce(mockEmbeddedProvider)
        .mockReturnValueOnce(mockEmbeddedProvider);
      
      mockEmbeddedProvider.getSessionRecoveryInfo.mockResolvedValue({
        canAutoRecover: true,
        sessionStatus: "pending",
        hasUrlParams: true,
        hasSession: true,
      });
      
      mockEmbeddedProvider.autoConnect.mockResolvedValue(undefined);
      mockProviderManager.isConnected.mockReturnValue(true);

      await sdk.autoConnect();

      expect(mockProviderManager.switchProvider).toHaveBeenCalledWith("embedded");
      expect(mockEmbeddedProvider.autoConnect).toHaveBeenCalled();
    });
  });

  describe("error handling", () => {
    let mockProviderManager: any;

    beforeEach(() => {
      mockProviderManager = {
        getCurrentProvider: jest.fn(),
        connect: jest.fn(),
        disconnect: jest.fn(),
        getAddresses: jest.fn(),
        isConnected: jest.fn(),
        getWalletId: jest.fn(),
        switchProvider: jest.fn(),
        getCurrentProviderInfo: jest.fn(),
        on: jest.fn(),
        off: jest.fn(),
      };

      MockProviderManager.mockImplementation(() => mockProviderManager);

      sdk = new BrowserSDK({
        appId: "app-123",
        addressTypes: [AddressType.solana],
      });
    });

    it("should propagate connection errors", async () => {
      mockProviderManager.connect.mockRejectedValue(new Error("Connection failed"));

      await expect(sdk.connect()).rejects.toThrow("Connection failed");
    });

    it("should propagate disconnect errors", async () => {
      mockProviderManager.disconnect.mockRejectedValue(new Error("Disconnect failed"));

      await expect(sdk.disconnect()).rejects.toThrow("Disconnect failed");
    });

    it("should propagate provider switch errors", async () => {
      mockProviderManager.switchProvider.mockRejectedValue(new Error("Switch failed"));

      await expect(sdk.switchProvider("injected")).rejects.toThrow("Switch failed");
    });

    it("should throw error if no provider available for chain access", () => {
      mockProviderManager.getCurrentProvider.mockReturnValue(null);

      expect(() => sdk.solana).toThrow("No provider available. Call connect() first.");
      expect(() => sdk.ethereum).toThrow("No provider available. Call connect() first.");
    });
  });

  describe("event handling", () => {
    let mockProviderManager: any;
    let mockCallback: jest.Mock;

    beforeEach(() => {
      mockCallback = jest.fn();
      mockProviderManager = {
        getCurrentProvider: jest.fn(),
        connect: jest.fn(),
        disconnect: jest.fn(),
        getAddresses: jest.fn(),
        isConnected: jest.fn(),
        getWalletId: jest.fn(),
        switchProvider: jest.fn(),
        getCurrentProviderInfo: jest.fn(),
        on: jest.fn(),
        off: jest.fn(),
      };

      MockProviderManager.mockImplementation(() => mockProviderManager);

      sdk = new BrowserSDK({
        appId: "app-123",
        addressTypes: [AddressType.solana],
      });
    });

    it("should forward event listener calls to provider manager", () => {
      sdk.on("connect", mockCallback);

      expect(mockProviderManager.on).toHaveBeenCalledWith("connect", mockCallback);
    });

    it("should forward event removal calls to provider manager", () => {
      sdk.off("connect", mockCallback);

      expect(mockProviderManager.off).toHaveBeenCalledWith("connect", mockCallback);
    });
  });

  describe("debug methods", () => {
    let mockProviderManager: any;

    beforeEach(() => {
      mockProviderManager = {
        getCurrentProvider: jest.fn(),
        connect: jest.fn(),
        disconnect: jest.fn(),
        getAddresses: jest.fn(),
        isConnected: jest.fn(),
        getWalletId: jest.fn(),
        switchProvider: jest.fn(),
        getCurrentProviderInfo: jest.fn(),
        on: jest.fn(),
        off: jest.fn(),
      };

      MockProviderManager.mockImplementation(() => mockProviderManager);

      sdk = new BrowserSDK({
        appId: "app-123",
        addressTypes: [AddressType.solana],
      });
    });

    it("should enable debug logging", () => {
      sdk.enableDebug();
      // Debug methods don't return values, just verify they don't throw
      expect(() => sdk.enableDebug()).not.toThrow();
    });

    it("should disable debug logging", () => {
      sdk.disableDebug();
      expect(() => sdk.disableDebug()).not.toThrow();
    });

    it("should set debug level", () => {
      sdk.setDebugLevel("info");
      expect(() => sdk.setDebugLevel("error")).not.toThrow();
    });

    it("should configure debug settings", () => {
      const mockCallback = jest.fn();
      sdk.configureDebug({ 
        enabled: true, 
        level: "debug", 
        callback: mockCallback 
      });
      expect(() => sdk.configureDebug({ enabled: false })).not.toThrow();
    });
  });

  describe("static methods", () => {
    it("should check if Phantom extension is installed", async () => {
      // Mock the static method
      jest.spyOn(BrowserSDK, 'isPhantomInstalled').mockResolvedValue(true);
      
      const result = await BrowserSDK.isPhantomInstalled();
      expect(result).toBe(true);
      
      jest.restoreAllMocks();
    });
  });
});
