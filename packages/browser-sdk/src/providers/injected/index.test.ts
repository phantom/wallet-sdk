import { InjectedProvider } from "./index";
import { AddressType } from "@phantom/client";
import { NetworkId } from "@phantom/constants";

// Mock the browser-injected-sdk modules
jest.mock("@phantom/browser-injected-sdk", () => ({
  createPhantom: jest.fn(),
  createExtensionPlugin: jest.fn(),
}));

jest.mock("@phantom/browser-injected-sdk/solana", () => ({
  createSolanaPlugin: jest.fn(),
}));

jest.mock("@phantom/browser-injected-sdk/ethereum", () => ({
  createEthereumPlugin: jest.fn(),
}));

describe("InjectedProvider", () => {
  let provider: InjectedProvider;
  let mockPhantom: any;
  let mockSolanaPlugin: any;
  let mockEthereumPlugin: any;
  let mockExtensionPlugin: any;

  beforeEach(() => {
    // Mock the phantom instance and plugins
    mockSolanaPlugin = {
      connect: jest.fn(),
      disconnect: jest.fn(),
      signMessage: jest.fn(),
      signAndSendTransaction: jest.fn(),
      addEventListener: jest.fn(() => jest.fn()), // Return cleanup function
    };

    mockEthereumPlugin = {
      connect: jest.fn(),
      disconnect: jest.fn(),
      signPersonalMessage: jest.fn(),
      sendTransaction: jest.fn(),
      addEventListener: jest.fn(() => jest.fn()), // Return cleanup function
    };

    mockExtensionPlugin = {
      isInstalled: jest.fn().mockReturnValue(true),
    };

    mockPhantom = {
      extension: mockExtensionPlugin,
      solana: mockSolanaPlugin,
      ethereum: mockEthereumPlugin,
    };

    // Mock the createPhantom function
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { createPhantom } = require("@phantom/browser-injected-sdk");
    createPhantom.mockReturnValue(mockPhantom);

    // Mock the plugin creators
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { createExtensionPlugin } = require("@phantom/browser-injected-sdk");
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { createSolanaPlugin } = require("@phantom/browser-injected-sdk/solana");
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { createEthereumPlugin } = require("@phantom/browser-injected-sdk/ethereum");

    createExtensionPlugin.mockReturnValue(mockExtensionPlugin);
    createSolanaPlugin.mockReturnValue(mockSolanaPlugin);
    createEthereumPlugin.mockReturnValue(mockEthereumPlugin);

    provider = new InjectedProvider({
      solanaProvider: "web3js",
      addressTypes: [AddressType.solana, AddressType.ethereum],
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe("connect", () => {
    it("should connect to Solana wallet", async () => {
      const mockPublicKey = "GfJ4JhQXbUMwh7x8e7YFHC3yLz5FJGvjurQrNxFWkeYH";
      mockSolanaPlugin.connect.mockResolvedValue(mockPublicKey);
      mockEthereumPlugin.connect.mockRejectedValue(new Error("Provider not found."));

      const result = await provider.connect();

      expect(mockSolanaPlugin.connect).toHaveBeenCalled();
      expect(result.addresses).toHaveLength(1);
      expect(result.addresses[0]).toEqual({
        addressType: AddressType.solana,
        address: mockPublicKey,
      });
      expect(provider.isConnected()).toBe(true);
    });

    it("should connect to Ethereum wallet", async () => {
      const mockAddresses = ["0x742d35Cc6634C0532925a3b844Bc9e7595f6cE65"];
      mockSolanaPlugin.connect.mockRejectedValue(new Error("Provider not found."));
      mockEthereumPlugin.connect.mockResolvedValue(mockAddresses);

      const result = await provider.connect();

      expect(mockEthereumPlugin.connect).toHaveBeenCalled();
      expect(result.addresses).toHaveLength(1);
      expect(result.addresses[0]).toEqual({
        addressType: AddressType.ethereum,
        address: mockAddresses[0],
      });
      expect(provider.isConnected()).toBe(true);
    });

    it("should throw error when Phantom wallet not found", async () => {
      mockExtensionPlugin.isInstalled.mockReturnValue(false);

      await expect(provider.connect()).rejects.toThrow("Phantom wallet not found");
    });

    it("should throw error when no provider connects successfully", async () => {
      mockSolanaPlugin.connect.mockRejectedValue(new Error("Provider not found."));
      mockEthereumPlugin.connect.mockRejectedValue(new Error("Provider not found."));

      await expect(provider.connect()).rejects.toThrow("Failed to connect to any supported wallet provider");
    });
  });

  describe("disconnect", () => {
    it("should disconnect from providers", async () => {
      // First connect
      mockSolanaPlugin.connect.mockResolvedValue("test-address");
      mockEthereumPlugin.connect.mockRejectedValue(new Error("Provider not found."));
      await provider.connect();

      // Then disconnect
      await provider.disconnect();

      expect(mockSolanaPlugin.disconnect).toHaveBeenCalled();
      expect(mockEthereumPlugin.disconnect).toHaveBeenCalled();
      expect(provider.isConnected()).toBe(false);
      expect(provider.getAddresses()).toEqual([]);
    });
  });

  describe("signMessage", () => {
    beforeEach(async () => {
      mockSolanaPlugin.connect.mockResolvedValue("test-solana-address");
      mockEthereumPlugin.connect.mockResolvedValue(["0x742d35Cc6634C0532925a3b844Bc9e7595f6cE65"]);
      await provider.connect();
    });

    it("should sign message with Solana", async () => {
      const message = "Hello Phantom!";
      const mockSignature = new Uint8Array([1, 2, 3, 4, 5]);
      mockSolanaPlugin.signMessage.mockResolvedValue({ signature: mockSignature });

      const result = await provider.signMessage({
        message,
        networkId: NetworkId.SOLANA_MAINNET,
      });

      expect(mockSolanaPlugin.signMessage).toHaveBeenCalledWith(new TextEncoder().encode(message));
      expect(result).toEqual({
        signature: expect.any(String),
        rawSignature: expect.any(String),
      });
      // Signature should be base58 encoded
      expect(result.signature).toBe("7bWpTW"); // base58 of [1,2,3,4,5]
      // Raw signature should be base64url encoded base58
      expect(result.rawSignature).toBe("N2JXcFRX"); // base64url of "7bWpTW"
    });

    it("should sign message with Ethereum", async () => {
      const message = "Hello Ethereum!";
      const mockSignature = "0x1234567890abcdef";
      mockEthereumPlugin.signPersonalMessage.mockResolvedValue(mockSignature);

      const result = await provider.signMessage({
        message,
        networkId: NetworkId.ETHEREUM_MAINNET,
      });

      expect(mockEthereumPlugin.signPersonalMessage).toHaveBeenCalledWith(
        message,
        "0x742d35Cc6634C0532925a3b844Bc9e7595f6cE65",
      );
      expect(result).toEqual({
        signature: mockSignature,
        rawSignature: expect.any(String),
      });
    });

    it("should throw error when not connected", async () => {
      await provider.disconnect();

      await expect(
        provider.signMessage({
          message: "test",
          networkId: NetworkId.SOLANA_MAINNET,
        }),
      ).rejects.toThrow("Wallet not connected");
    });
  });

  describe("signAndSendTransaction", () => {
    beforeEach(async () => {
      mockSolanaPlugin.connect.mockResolvedValue("test-solana-address");
      mockEthereumPlugin.connect.mockResolvedValue(["0x742d35Cc6634C0532925a3b844Bc9e7595f6cE65"]);
      await provider.connect();
    });

    it("should sign and send Solana transaction", async () => {
      const mockTransaction = { messageBytes: new Uint8Array([1, 2, 3, 4, 5]) };
      const mockSignature = "mockSignature123";
      mockSolanaPlugin.signAndSendTransaction.mockResolvedValue({ signature: mockSignature });

      const result = await provider.signAndSendTransaction({
        transaction: mockTransaction,
        networkId: NetworkId.SOLANA_MAINNET,
      });

      expect(mockSolanaPlugin.signAndSendTransaction).toHaveBeenCalledWith(mockTransaction);
      expect(result).toEqual({
        hash: mockSignature,
        rawTransaction: expect.any(String),
        blockExplorer: expect.stringContaining("https://"),
      });
    });

    it("should sign and send Ethereum transaction", async () => {
      const mockTransaction = {
        to: "0x742d35Cc6634C0532925a3b844Bc9e7595f6cE65",
        value: "0x1000000000000000000",
        gas: "0x5208",
      };
      const mockTxHash = "0xabcdef1234567890";
      mockEthereumPlugin.sendTransaction.mockResolvedValue(mockTxHash);

      const result = await provider.signAndSendTransaction({
        transaction: mockTransaction,
        networkId: NetworkId.ETHEREUM_MAINNET,
      });

      expect(mockEthereumPlugin.sendTransaction).toHaveBeenCalledWith({
        to: "0x742d35Cc6634C0532925a3b844Bc9e7595f6cE65",
        value: "0x1000000000000000000",
        gas: "0x5208",
        gasPrice: undefined,
        maxFeePerGas: undefined,
        maxPriorityFeePerGas: undefined,
        data: "0x",
      });
      expect(result).toEqual({
        hash: mockTxHash,
        rawTransaction: expect.any(String),
        blockExplorer: expect.stringContaining("https://"),
      });
    });

    it("should throw error when not connected", async () => {
      await provider.disconnect();

      await expect(
        provider.signAndSendTransaction({
          transaction: { messageBytes: new Uint8Array([1, 2, 3]) },
          networkId: NetworkId.SOLANA_MAINNET,
        }),
      ).rejects.toThrow("Wallet not connected");
    });
  });

  describe("getAddresses", () => {
    it("should return empty array when not connected", () => {
      const addresses = provider.getAddresses();
      expect(addresses).toEqual([]);
    });

    it("should return addresses after connection", async () => {
      mockSolanaPlugin.connect.mockResolvedValue("test-address");
      mockEthereumPlugin.connect.mockRejectedValue(new Error("Provider not found."));

      await provider.connect();
      const addresses = provider.getAddresses();

      expect(addresses).toHaveLength(1);
      expect(addresses[0].address).toBe("test-address");
    });
  });

  describe("isConnected", () => {
    it("should return false initially", () => {
      expect(provider.isConnected()).toBe(false);
    });

    it("should return true after connection", async () => {
      mockSolanaPlugin.connect.mockResolvedValue("test-address");
      mockEthereumPlugin.connect.mockRejectedValue(new Error("Provider not found."));

      await provider.connect();
      expect(provider.isConnected()).toBe(true);
    });

    it("should return false after disconnection", async () => {
      mockSolanaPlugin.connect.mockResolvedValue("test-address");
      mockEthereumPlugin.connect.mockRejectedValue(new Error("Provider not found."));

      await provider.connect();
      await provider.disconnect();
      expect(provider.isConnected()).toBe(false);
    });
  });
});
