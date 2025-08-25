import { InjectedProvider } from "./index";
import { AddressType } from "@phantom/client";
import { createMockSolanaProvider, createMockEthereumProvider, setupWindowMock } from "../../test-utils/mockWindow";

// Mock the browser-injected-sdk modules
jest.mock("@phantom/browser-injected-sdk", () => ({
  createPhantom: jest.fn(),
  createExtensionPlugin: jest.fn(),
  isPhantomExtensionInstalled: jest.fn(),
}));

jest.mock("@phantom/browser-injected-sdk/solana", () => ({
  createSolanaPlugin: jest.fn(),
}));

jest.mock("@phantom/browser-injected-sdk/ethereum", () => ({
  createEthereumPlugin: jest.fn(),
}));

describe("InjectedProvider", () => {
  let provider: InjectedProvider;
  let mockSolanaProvider: any;
  let mockEthereumProvider: any;

  beforeEach(() => {
    // Create mock providers for window.phantom
    mockSolanaProvider = createMockSolanaProvider();
    mockEthereumProvider = createMockEthereumProvider();

    // Set up window.phantom mock
    setupWindowMock({
      solana: mockSolanaProvider,
      ethereum: mockEthereumProvider,
    });

    // Mock the isPhantomExtensionInstalled function
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { isPhantomExtensionInstalled } = require("@phantom/browser-injected-sdk");
    isPhantomExtensionInstalled.mockReturnValue(true);

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
      mockSolanaProvider.connect.mockResolvedValue({ publicKey: { toString: () => mockPublicKey } });
      mockEthereumProvider.request.mockResolvedValue([]);

      const result = await provider.connect();

      expect(mockSolanaProvider.connect).toHaveBeenCalled();
      expect(result.addresses).toHaveLength(1);
      expect(result.addresses[0]).toEqual({
        addressType: AddressType.solana,
        address: mockPublicKey,
      });
      expect(provider.isConnected()).toBe(true);
    });

    it("should connect to Ethereum wallet", async () => {
      const mockAddresses = ["0x742d35Cc6634C0532925a3b844Bc9e7595f6cE65"];
      mockSolanaProvider.connect.mockRejectedValue(new Error("Provider not found."));
      mockEthereumProvider.request.mockImplementation((params: { method: string }) => {
        if (params.method === 'eth_accounts') {
          return Promise.resolve(mockAddresses);
        }
        return Promise.resolve([]);
      });

      const result = await provider.connect();

      expect(mockEthereumProvider.request).toHaveBeenCalledWith({ method: 'eth_accounts' });
      expect(result.addresses).toHaveLength(1);
      expect(result.addresses[0]).toEqual({
        addressType: AddressType.ethereum,
        address: mockAddresses[0],
      });
      expect(provider.isConnected()).toBe(true);
    });

    it("should throw error when Phantom wallet not found", async () => {
      // Mock the isPhantomExtensionInstalled to return false for this test
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const { isPhantomExtensionInstalled } = require("@phantom/browser-injected-sdk");
      isPhantomExtensionInstalled.mockReturnValue(false);

      await expect(provider.connect()).rejects.toThrow("Phantom wallet not found");
    });

    it("should throw error when no provider connects successfully", async () => {
      mockSolanaProvider.connect.mockRejectedValue(new Error("Provider not found."));
      mockEthereumProvider.request.mockRejectedValue(new Error("Provider not found."));

      await expect(provider.connect()).rejects.toThrow("Failed to connect to any supported wallet provider");
    });
  });

  describe("disconnect", () => {
    it("should disconnect from providers", async () => {
      // First connect
      mockSolanaProvider.connect.mockResolvedValue({ publicKey: { toString: () => "test-address" } });
      mockEthereumProvider.request.mockResolvedValue([]);
      await provider.connect();

      // Then disconnect
      await provider.disconnect();

      expect(mockSolanaProvider.disconnect).toHaveBeenCalled();
      expect(provider.isConnected()).toBe(false);
      expect(provider.getAddresses()).toEqual([]);
    });
  });

  describe("signMessage", () => {
    beforeEach(async () => {
      mockSolanaProvider.connect.mockResolvedValue({ publicKey: { toString: () => "test-solana-address" } });
      mockEthereumProvider.request.mockImplementation((params: { method: string }) => {
        if (params.method === 'eth_accounts') {
          return Promise.resolve(["0x742d35Cc6634C0532925a3b844Bc9e7595f6cE65"]);
        }
        return Promise.resolve([]);
      });
      await provider.connect();
    });

    it("should sign message with Solana", async () => {
      const message = "Hello Phantom!";
      const mockSignature = "7bWpTW"; // base58 encoded signature
      mockSolanaProvider.signMessage.mockResolvedValue({ signature: mockSignature });

      const result = await provider.solana.signMessage(message);

      expect(mockSolanaProvider.signMessage).toHaveBeenCalledWith({ message });
      expect(result).toEqual({
        signature: mockSignature,
        rawSignature: mockSignature,
      });
    });

    it("should sign message with Ethereum", async () => {
      const message = "Hello Ethereum!";
      const address = "0x742d35Cc6634C0532925a3b844Bc9e7595f6cE65";
      const mockSignature = "0x1234567890abcdef";
      mockEthereumProvider.request.mockImplementation((params) => {
        if (params.method === 'personal_sign') {
          return Promise.resolve(mockSignature);
        }
        return Promise.resolve([]);
      });

      const result = await provider.ethereum.signPersonalMessage(message, address);

      expect(mockEthereumProvider.request).toHaveBeenCalledWith({
        method: 'personal_sign',
        params: [message, address]
      });
      expect(result).toEqual({
        signature: mockSignature,
        rawSignature: mockSignature,
      });
    });

    it("should throw error when not connected", async () => {
      await provider.disconnect();
      // Clear the window.phantom mock to simulate the extension not being available
      // @ts-ignore
      const originalPhantom = global.window.phantom;
      // @ts-ignore
      global.window.phantom = undefined;

      await expect(provider.solana.signMessage("test")).rejects.toThrow("Phantom Solana provider not found");
      
      // Restore the mock for other tests
      // @ts-ignore
      global.window.phantom = originalPhantom;
    });
  });

  describe("signAndSendTransaction", () => {
    beforeEach(async () => {
      mockSolanaProvider.connect.mockResolvedValue({ publicKey: { toString: () => "test-solana-address" } });
      mockEthereumProvider.request.mockImplementation((params: { method: string }) => {
        if (params.method === 'eth_accounts') {
          return Promise.resolve(["0x742d35Cc6634C0532925a3b844Bc9e7595f6cE65"]);
        }
        return Promise.resolve([]);
      });
      await provider.connect();
    });

    it("should sign and send Solana transaction", async () => {
      const mockTransaction = { messageBytes: new Uint8Array([1, 2, 3, 4, 5]) };
      const mockSignature = "mockSignature123";
      mockSolanaProvider.signAndSendTransaction.mockResolvedValue({ signature: mockSignature });

      const result = await provider.solana.signAndSendTransaction(mockTransaction);

      expect(mockSolanaProvider.signAndSendTransaction).toHaveBeenCalledWith(mockTransaction);
      expect(result).toEqual({
        hash: mockSignature,
        rawTransaction: mockSignature,
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
      mockEthereumProvider.request.mockImplementation((params) => {
        if (params.method === 'eth_sendTransaction') {
          return Promise.resolve(mockTxHash);
        }
        if (params.method === 'eth_chainId') {
          return Promise.resolve('0x1'); // mainnet
        }
        return Promise.resolve([]);
      });

      const result = await provider.ethereum.sendTransaction(mockTransaction);

      expect(mockEthereumProvider.request).toHaveBeenCalledWith({
        method: 'eth_sendTransaction',
        params: [mockTransaction]
      });
      expect(result).toEqual({
        hash: mockTxHash,
        rawTransaction: mockTxHash,
        blockExplorer: expect.stringContaining("https://"),
      });
    });

    it("should throw error when not connected", async () => {
      await provider.disconnect();
      // Clear the window.phantom mock to simulate the extension not being available
      // @ts-ignore
      const originalPhantom = global.window.phantom;
      // @ts-ignore
      global.window.phantom = undefined;

      await expect(
        provider.solana.signAndSendTransaction({ messageBytes: new Uint8Array([1, 2, 3]) })
      ).rejects.toThrow("Phantom Solana provider not found");
      
      // Restore the mock for other tests
      // @ts-ignore
      global.window.phantom = originalPhantom;
    });
  });

  describe("getAddresses", () => {
    it("should return empty array when not connected", () => {
      const addresses = provider.getAddresses();
      expect(addresses).toEqual([]);
    });

    it("should return addresses after connection", async () => {
      mockSolanaProvider.connect.mockResolvedValue({ publicKey: { toString: () => "test-address" } });
      mockEthereumProvider.request.mockResolvedValue([]);

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
      mockSolanaProvider.connect.mockResolvedValue({ publicKey: { toString: () => "test-address" } });
      mockEthereumProvider.request.mockResolvedValue([]);

      await provider.connect();
      expect(provider.isConnected()).toBe(true);
    });

    it("should return false after disconnection", async () => {
      mockSolanaProvider.connect.mockResolvedValue({ publicKey: { toString: () => "test-address" } });
      mockEthereumProvider.request.mockResolvedValue([]);

      await provider.connect();
      await provider.disconnect();
      expect(provider.isConnected()).toBe(false);
    });
  });
});
