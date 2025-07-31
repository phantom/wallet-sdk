import { BrowserSDK } from "./BrowserSDK";
import { InjectedProvider } from "./providers/injected";
import { EmbeddedProvider } from "./providers/embedded";
import { cleanupWindowMock } from "./test-utils/mockWindow";
import { AddressType, NetworkId } from "@phantom/client";

// Mock the providers
jest.mock("./providers/injected");
jest.mock("./providers/embedded");

const MockInjectedProvider = InjectedProvider as jest.MockedClass<typeof InjectedProvider>;
const MockEmbeddedProvider = EmbeddedProvider as jest.MockedClass<typeof EmbeddedProvider>;

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
    it("should create SDK with injected provider", () => {
      sdk = new BrowserSDK({
        providerType: "injected",
        appName: "Test App",
      });

      expect(MockInjectedProvider).toHaveBeenCalledWith({
        solanaProvider: "web3js",
        addressTypes: [],
      });
      expect(MockEmbeddedProvider).not.toHaveBeenCalled();
    });

    it("should create SDK with embedded provider", () => {
      sdk = new BrowserSDK({
        providerType: "embedded",
        appName: "Test App",
        apiBaseUrl: "https://api.phantom.com",
        organizationId: "org-123",
        authUrl: "https://auth.phantom.com",
      });

      expect(MockEmbeddedProvider).toHaveBeenCalledWith({
        apiBaseUrl: "https://api.phantom.com",
        organizationId: "org-123",
        authUrl: "https://auth.phantom.com",
        embeddedWalletType: "app-wallet",
        addressTypes: [],
        solanaProvider: "web3js",
      });
      expect(MockInjectedProvider).not.toHaveBeenCalled();
    });

    it("should use custom embeddedWalletType", () => {
      sdk = new BrowserSDK({
        providerType: "embedded",
        apiBaseUrl: "https://api.phantom.com",
        organizationId: "org-123",
        authUrl: "https://auth.phantom.com",
        embeddedWalletType: "user-wallet",
      });

      expect(MockEmbeddedProvider).toHaveBeenCalledWith({
        apiBaseUrl: "https://api.phantom.com",
        organizationId: "org-123",
        authUrl: "https://auth.phantom.com",
        embeddedWalletType: "user-wallet",
        addressTypes: [],
        solanaProvider: "web3js",
      });
    });

    it("should throw error for embedded provider without required config", () => {
      expect(() => {
        new BrowserSDK({
          providerType: "embedded",
          appName: "Test App",
        });
      }).toThrow("apiBaseUrl and organizationId are required for embedded provider");
    });

    it("should support custom solanaProvider for injected", () => {
      sdk = new BrowserSDK({
        providerType: "injected",
        solanaProvider: "kit",
      });

      expect(MockInjectedProvider).toHaveBeenCalledWith({
        solanaProvider: "kit",
        addressTypes: [],
      });
    });

    it("should support custom solanaProvider for embedded", () => {
      sdk = new BrowserSDK({
        providerType: "embedded",
        apiBaseUrl: "https://api.phantom.com",
        organizationId: "org-123",
        solanaProvider: "kit",
        addressTypes: [AddressType.solana],
      });

      expect(MockEmbeddedProvider).toHaveBeenCalledWith({
        apiBaseUrl: "https://api.phantom.com",
        organizationId: "org-123",
        authUrl: undefined,
        embeddedWalletType: "app-wallet",
        addressTypes: [AddressType.solana],
        solanaProvider: "kit",
      });
    });

    it("should throw error for invalid provider type", () => {
      expect(() => {
        new BrowserSDK({
          providerType: "invalid" as any,
        });
      }).toThrow('Invalid providerType: invalid. Must be "injected" or "embedded".');
    });
  });

  describe("injected provider methods", () => {
    let mockProvider: any;

    beforeEach(() => {
      mockProvider = {
        connect: jest.fn(),
        disconnect: jest.fn(),
        signMessage: jest.fn(),
        signAndSendTransaction: jest.fn(),
        getAddresses: jest.fn(),
        isConnected: jest.fn(),
      };

      MockInjectedProvider.mockImplementation(() => mockProvider);

      sdk = new BrowserSDK({
        providerType: "injected",
      });
    });

    describe("connect", () => {
      it("should call provider connect", async () => {
        const mockResult = {
          addresses: [
            {
              addressType: AddressType.solana,
              address: "test-address",
            },
          ],
        };
        mockProvider.connect.mockResolvedValue(mockResult);

        const result = await sdk.connect();

        expect(mockProvider.connect).toHaveBeenCalled();
        expect(result).toEqual(mockResult);
        expect(sdk.getWalletId()).toBeNull();
      });
    });

    describe("disconnect", () => {
      it("should call provider disconnect", async () => {
        mockProvider.disconnect.mockResolvedValue(undefined);

        await sdk.disconnect();

        expect(mockProvider.disconnect).toHaveBeenCalled();
        expect(sdk.getWalletId()).toBeNull();
      });
    });

    describe("signMessage", () => {
      it("should call provider signMessage", async () => {
        const mockSignature = "mockSignature";
        mockProvider.signMessage.mockResolvedValue(mockSignature);

        const result = await sdk.signMessage({
          message: "test-message",
          networkId: NetworkId.SOLANA_MAINNET,
        });

        expect(mockProvider.signMessage).toHaveBeenCalledWith({
          message: "test-message",
          networkId: NetworkId.SOLANA_MAINNET,
        });
        expect(result).toBe(mockSignature);
      });
    });

    describe("signAndSendTransaction", () => {
      it("should call provider signAndSendTransaction", async () => {
        const mockResult = { rawTransaction: "mockTxHash" };
        mockProvider.signAndSendTransaction.mockResolvedValue(mockResult);

        const mockTransaction = { to: "0x123", value: "1000000000000000000" };
        const result = await sdk.signAndSendTransaction({
          transaction: mockTransaction,
          networkId: NetworkId.ETHEREUM_MAINNET,
        });

        expect(mockProvider.signAndSendTransaction).toHaveBeenCalledWith({
          transaction: mockTransaction,
          networkId: NetworkId.ETHEREUM_MAINNET,
        });
        expect(result).toEqual(mockResult);
      });
    });

    describe("getAddresses", () => {
      it("should call provider getAddresses", async () => {
        const mockAddresses = [
          {
            addressType: AddressType.ethereum,
            address: "0x123",
          },
        ];
        mockProvider.getAddresses.mockResolvedValue(mockAddresses);

        const result = await sdk.getAddresses();

        expect(mockProvider.getAddresses).toHaveBeenCalled();
        expect(result).toEqual(mockAddresses);
      });
    });

    describe("isConnected", () => {
      it("should call provider isConnected", () => {
        mockProvider.isConnected.mockReturnValue(true);

        const result = sdk.isConnected();

        expect(mockProvider.isConnected).toHaveBeenCalled();
        expect(result).toBe(true);
      });
    });
  });

  describe("embedded provider methods", () => {
    let mockProvider: any;

    beforeEach(() => {
      mockProvider = {
        connect: jest.fn(),
        disconnect: jest.fn(),
        signMessage: jest.fn(),
        signAndSendTransaction: jest.fn(),
        getAddresses: jest.fn(),
        isConnected: jest.fn(),
      };

      MockEmbeddedProvider.mockImplementation(() => mockProvider);

      sdk = new BrowserSDK({
        providerType: "embedded",
        apiBaseUrl: "https://api.phantom.com",
        organizationId: "org-123",
        authUrl: "https://auth.phantom.com",
        embeddedWalletType: "app-wallet",
      });
    });

    describe("connect", () => {
      it("should call provider connect and store walletId", async () => {
        const mockResult = {
          walletId: "wallet-123",
          addresses: [
            {
              addressType: AddressType.solana,
              address: "test-address",
            },
          ],
        };
        mockProvider.connect.mockResolvedValue(mockResult);

        const result = await sdk.connect();

        expect(mockProvider.connect).toHaveBeenCalled();
        expect(result).toEqual(mockResult);
        expect(sdk.getWalletId()).toBe("wallet-123");
      });
    });

    describe("disconnect", () => {
      it("should call provider disconnect and clear walletId", async () => {
        // First connect to set walletId
        mockProvider.connect.mockResolvedValue({
          walletId: "wallet-123",
          addresses: [],
        });
        await sdk.connect();

        mockProvider.disconnect.mockResolvedValue(undefined);

        await sdk.disconnect();

        expect(mockProvider.disconnect).toHaveBeenCalled();
        expect(sdk.getWalletId()).toBeNull();
      });
    });

    describe("signMessage", () => {
      it("should call provider signMessage with walletId", async () => {
        // First connect to set walletId
        mockProvider.connect.mockResolvedValue({
          walletId: "wallet-123",
          addresses: [],
        });
        await sdk.connect();

        const mockSignature = "mockSignature";
        mockProvider.signMessage.mockResolvedValue(mockSignature);

        const result = await sdk.signMessage({
          message: "test-message",
          networkId: NetworkId.SOLANA_MAINNET,
        });

        expect(mockProvider.signMessage).toHaveBeenCalledWith({
          message: "test-message",
          networkId: NetworkId.SOLANA_MAINNET,
        });
        expect(result).toBe(mockSignature);
      });
    });

    describe("signAndSendTransaction", () => {
      it("should call provider signAndSendTransaction with walletId", async () => {
        // First connect to set walletId
        mockProvider.connect.mockResolvedValue({
          walletId: "wallet-123",
          addresses: [],
        });
        await sdk.connect();

        const mockResult = { rawTransaction: "mockTxHash" };
        mockProvider.signAndSendTransaction.mockResolvedValue(mockResult);

        const mockTransaction = { to: "0x123", value: "1000000000000000000" };
        const result = await sdk.signAndSendTransaction({
          transaction: mockTransaction,
          networkId: NetworkId.ETHEREUM_MAINNET,
        });

        expect(mockProvider.signAndSendTransaction).toHaveBeenCalledWith({
          transaction: mockTransaction,
          networkId: NetworkId.ETHEREUM_MAINNET,
        });
        expect(result).toEqual(mockResult);
      });
    });
  });

  describe("error handling", () => {
    let mockProvider: any;

    beforeEach(() => {
      mockProvider = {
        connect: jest.fn(),
        disconnect: jest.fn(),
        signMessage: jest.fn(),
        signAndSendTransaction: jest.fn(),
        getAddresses: jest.fn(),
        isConnected: jest.fn(),
      };

      MockInjectedProvider.mockImplementation(() => mockProvider);

      sdk = new BrowserSDK({
        providerType: "injected",
      });
    });

    it("should propagate connection errors", async () => {
      mockProvider.connect.mockRejectedValue(new Error("Connection failed"));

      await expect(sdk.connect()).rejects.toThrow("Connection failed");
    });

    it("should propagate signing errors", async () => {
      mockProvider.signMessage.mockRejectedValue(new Error("Signing failed"));

      await expect(
        sdk.signMessage({
          message: "test",
          networkId: NetworkId.SOLANA_MAINNET,
        }),
      ).rejects.toThrow("Signing failed");
    });

    it("should propagate transaction errors", async () => {
      mockProvider.signAndSendTransaction.mockRejectedValue(new Error("Transaction failed"));

      await expect(
        sdk.signAndSendTransaction({
          transaction: { to: "0x123" },
          networkId: NetworkId.SOLANA_MAINNET,
        }),
      ).rejects.toThrow("Transaction failed");
    });
  });
});
