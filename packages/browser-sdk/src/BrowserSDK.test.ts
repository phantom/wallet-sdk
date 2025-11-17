import { BrowserSDK } from "./BrowserSDK";
import { InjectedProvider } from "./providers/injected";
import { EmbeddedProvider } from "./providers/embedded";
import { cleanupWindowMock } from "./test-utils/mockWindow";
import { AddressType } from "@phantom/client";

// Mock parsers to prevent ESM module parsing issues
jest.mock("@phantom/parsers", () => ({
  parseToKmsTransaction: jest.fn().mockResolvedValue({ base64url: "mock-base64url", originalFormat: "mock" }),
  parseSignMessageResponse: jest.fn().mockReturnValue({ signature: "mock-signature", rawSignature: "mock-raw" }),
  parseTransactionResponse: jest.fn().mockReturnValue({
    hash: "mock-transaction-hash",
    rawTransaction: "mock-raw-tx",
    blockExplorer: "https://explorer.com/tx/mock-transaction-hash",
  }),
  parseSolanaTransactionSignature: jest.fn().mockReturnValue({ signature: "mock-signature", fallback: false }),
}));

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
        providers: ["injected"],
        addressTypes: [AddressType.solana],
      });

      expect(MockInjectedProvider).toHaveBeenCalledWith({
        addressTypes: [AddressType.solana],
      });
      expect(MockEmbeddedProvider).not.toHaveBeenCalled();
    });

    it("should create SDK with embedded provider", () => {
      sdk = new BrowserSDK({
        providers: ["google", "apple", "phantom"],
        addressTypes: [AddressType.solana],
        apiBaseUrl: "https://api.phantom.app/v1/wallets",
        appId: "app-123",
        authOptions: {
          authUrl: "https://auth.phantom.com",
        },
      });

      expect(MockEmbeddedProvider).toHaveBeenCalledWith({
        apiBaseUrl: "https://api.phantom.app/v1/wallets",
        appId: "app-123",
        authOptions: {
          authUrl: "https://auth.phantom.com",
          redirectUrl: "https://localhost:3000/",
        },
        embeddedWalletType: "user-wallet",
        addressTypes: [AddressType.solana],
      });

      // Injected not created since not in providers array
      expect(MockInjectedProvider).not.toHaveBeenCalled();
    });

    it("should use custom embeddedWalletType", () => {
      sdk = new BrowserSDK({
        providers: ["google", "apple"],
        apiBaseUrl: "https://api.phantom.app/v1/wallets",
        appId: "app-123",
        authOptions: {
          authUrl: "https://auth.phantom.com",
        },
        addressTypes: [AddressType.solana],
        embeddedWalletType: "user-wallet",
      });

      expect(MockEmbeddedProvider).toHaveBeenCalledWith({
        apiBaseUrl: "https://api.phantom.app/v1/wallets",
        appId: "app-123",
        authOptions: {
          authUrl: "https://auth.phantom.com",
          redirectUrl: "https://localhost:3000/",
        },
        embeddedWalletType: "user-wallet",
        addressTypes: [AddressType.solana],
      });
    });

    it("should throw error for embedded provider without required config", () => {
      expect(() => {
        new BrowserSDK({
          providers: ["google"],
        });
      }).toThrow("appId is required when using embedded providers");
    });

    it("should throw error for empty providers array", () => {
      expect(() => {
        new BrowserSDK({
          providers: [] as any,
          addressTypes: [AddressType.solana],
        });
      }).toThrow("providers must be a non-empty array of AuthProviderType");
    });

    it("should throw error for invalid provider type", () => {
      expect(() => {
        new BrowserSDK({
          providers: ["invalid-provider" as any, "google"],
          addressTypes: [AddressType.solana],
          appId: "test-app-id",
        });
      }).toThrow("Invalid provider type(s): invalid-provider");
    });

    it("should throw error for multiple invalid provider types", () => {
      expect(() => {
        new BrowserSDK({
          providers: ["invalid1" as any, "google", "invalid2" as any],
          addressTypes: [AddressType.solana],
          appId: "test-app-id",
        });
      }).toThrow("Invalid provider type(s): invalid1, invalid2");
    });
  });

  describe("injected provider methods", () => {
    let mockProvider: any;

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

      MockInjectedProvider.mockImplementation(() => mockProvider);

      sdk = new BrowserSDK({
        providers: ["injected"],
        addressTypes: [AddressType.solana],
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

        const result = await sdk.connect({ provider: "injected" });

        expect(mockProvider.connect).toHaveBeenCalled();
        expect(result).toEqual(mockResult);
      });
    });

    describe("disconnect", () => {
      it("should call provider disconnect", async () => {
        mockProvider.disconnect.mockResolvedValue(undefined);

        await sdk.disconnect();

        expect(mockProvider.disconnect).toHaveBeenCalled();
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

      MockEmbeddedProvider.mockImplementation(() => mockProvider);

      sdk = new BrowserSDK({
        providers: ["google", "apple", "phantom"],
        addressTypes: [AddressType.solana],
        apiBaseUrl: "https://api.phantom.app/v1/wallets",
        appId: "app-123",
        authOptions: {
          authUrl: "https://auth.phantom.com",
        },
        embeddedWalletType: "app-wallet",
      });
    });

    describe("connect", () => {
      it("should call provider connect", async () => {
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

        const result = await sdk.connect({ provider: "phantom" });

        expect(mockProvider.connect).toHaveBeenCalled();
        expect(result).toEqual(mockResult);
      });
    });

    describe("disconnect", () => {
      it("should call provider disconnect", async () => {
        // First connect to set walletId
        mockProvider.connect.mockResolvedValue({
          walletId: "wallet-123",
          addresses: [],
        });
        await sdk.connect({ provider: "phantom" });

        mockProvider.disconnect.mockResolvedValue(undefined);

        await sdk.disconnect();

        expect(mockProvider.disconnect).toHaveBeenCalled();
      });
    });

    describe("signMessage", () => {
      it("should call Solana chain signMessage with walletId", async () => {
        // First connect to set walletId
        mockProvider.connect.mockResolvedValue({
          walletId: "wallet-123",
          addresses: [],
        });
        await sdk.connect({ provider: "phantom" });

        const mockSignature = { signature: "mockSignature", rawSignature: "mockRaw" };
        mockProvider.solana.signMessage.mockResolvedValue(mockSignature);

        const result = await sdk.solana.signMessage("test-message");

        expect(mockProvider.solana.signMessage).toHaveBeenCalledWith("test-message");
        expect(result).toBe(mockSignature);
      });
    });

    describe("signAndSendTransaction", () => {
      it("should call Ethereum chain sendTransaction with walletId", async () => {
        // First connect to set walletId
        mockProvider.connect.mockResolvedValue({
          walletId: "wallet-123",
          addresses: [],
        });
        await sdk.connect({ provider: "phantom" });

        const mockResult = { rawTransaction: "mockTxHash", hash: "0xmockHash" };
        mockProvider.ethereum.sendTransaction.mockResolvedValue(mockResult);

        const mockTransaction = { to: "0x123", value: "1000000000000000000" };
        const result = await sdk.ethereum.sendTransaction(mockTransaction);

        expect(mockProvider.ethereum.sendTransaction).toHaveBeenCalledWith(mockTransaction);
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

      MockInjectedProvider.mockImplementation(() => mockProvider);

      sdk = new BrowserSDK({
        providers: ["injected"],
        addressTypes: [AddressType.solana],
      });
    });

    it("should propagate connection errors", async () => {
      mockProvider.connect.mockRejectedValue(new Error("Connection failed"));

      await expect(sdk.connect({ provider: "injected" })).rejects.toThrow("Connection failed");
    });

    it("should propagate signing errors", async () => {
      mockProvider.solana.signMessage.mockRejectedValue(new Error("Signing failed"));

      await expect(sdk.solana.signMessage("test")).rejects.toThrow("Signing failed");
    });

    it("should propagate transaction errors", async () => {
      mockProvider.solana.signAndSendTransaction.mockRejectedValue(new Error("Transaction failed"));

      await expect(sdk.solana.signAndSendTransaction({ instructions: [] })).rejects.toThrow("Transaction failed");
    });
  });
});
