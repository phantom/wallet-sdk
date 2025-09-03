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
  let mockSolanaProvider: any;
  let mockEthereumProvider: any;
  let mockPhantomObject: any;

  beforeEach(() => {
    // Create mock providers for window.phantom
    mockSolanaProvider = createMockSolanaProvider();
    mockEthereumProvider = createMockEthereumProvider();

    // Set up window.phantom mock
    setupWindowMock({
      solana: mockSolanaProvider,
      ethereum: mockEthereumProvider,
    });

    // Create the default mock phantom object
    mockPhantomObject = {
      extension: {
        isInstalled: () => true,
      },
      solana: {
        connect: jest.fn().mockResolvedValue("GfJ4JhQXbUMwh7x8e7YFHC3yLz5FJGvjurQrNxFWkeYH"),
        disconnect: jest.fn(),
        getAccount: jest.fn(),
        signMessage: jest.fn().mockResolvedValue({ signature: "mock-signature" }),
        signIn: jest.fn(),
        signAndSendTransaction: jest.fn().mockResolvedValue({ signature: "mock-transaction-signature" }),
        addEventListener: jest.fn().mockReturnValue(() => {}),
        removeEventListener: jest.fn(),
      },
      ethereum: {
        connect: jest.fn(),
        disconnect: jest.fn(),
        getAccounts: jest.fn().mockResolvedValue([]),
        signMessage: jest.fn(),
        signPersonalMessage: jest.fn().mockResolvedValue("mock-eth-signature"),
        signTypedData: jest.fn().mockResolvedValue("mock-typed-data-signature"),
        signIn: jest.fn(),
        sendTransaction: jest.fn().mockResolvedValue("mock-tx-hash"),
        signTransaction: jest.fn(),
        getChainId: jest.fn().mockResolvedValue("0x1"),
        switchChain: jest.fn(),
        getProvider: jest.fn().mockResolvedValue({
          request: mockEthereumProvider.request,
        }),
        addEventListener: jest.fn().mockReturnValue(() => {}),
        removeEventListener: jest.fn(),
      },
      autoConfirm: {
        autoConfirmEnable: jest.fn(),
        autoConfirmDisable: jest.fn(),
        autoConfirmStatus: jest.fn(),
        autoConfirmSupportedChains: jest.fn(),
      },
    };

    // Mock the browser-injected-sdk modules
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { isPhantomExtensionInstalled, createPhantom } = require("@phantom/browser-injected-sdk");
    isPhantomExtensionInstalled.mockReturnValue(true);
    createPhantom.mockReturnValue(mockPhantomObject);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe("connect", () => {
    it("should connect to Solana wallet", async () => {
      const mockPublicKey = "GfJ4JhQXbUMwh7x8e7YFHC3yLz5FJGvjurQrNxFWkeYH";

      const provider = new InjectedProvider({
        solanaProvider: "web3js",
        addressTypes: [AddressType.solana, AddressType.ethereum],
      });

      const result = await provider.connect();

      expect(result.addresses).toHaveLength(1);
      expect(result.addresses[0]).toEqual({
        addressType: AddressType.solana,
        address: mockPublicKey,
      });
      expect(provider.isConnected()).toBe(true);
    });

    it("should connect to Ethereum wallet", async () => {
      const mockAddresses = ["0x742d35Cc6634C0532925a3b844Bc9e7595f6cE65"];

      // Update the mock to make Solana fail and Ethereum succeed
      mockPhantomObject.solana.connect.mockRejectedValue(new Error("Provider not found."));
      mockPhantomObject.ethereum.connect.mockResolvedValue(mockAddresses);
      
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const { createPhantom } = require("@phantom/browser-injected-sdk");
      createPhantom.mockReturnValue(mockPhantomObject);

      const provider = new InjectedProvider({
        solanaProvider: "web3js",
        addressTypes: [AddressType.solana, AddressType.ethereum],
      });

      const result = await provider.connect();

      expect(result.addresses).toHaveLength(1);
      expect(result.addresses[0]).toEqual({
        addressType: AddressType.ethereum,
        address: mockAddresses[0],
      });
      expect(provider.isConnected()).toBe(true);
    });

    it("should throw error when Phantom wallet not found", async () => {
      // Mock extension as not installed
      mockPhantomObject.extension.isInstalled = () => false;

      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const { createPhantom } = require("@phantom/browser-injected-sdk");
      createPhantom.mockReturnValue(mockPhantomObject);

      const provider = new InjectedProvider({
        solanaProvider: "web3js",
        addressTypes: [AddressType.solana, AddressType.ethereum],
      });

      await expect(provider.connect()).rejects.toThrow("Phantom wallet not found");
    });

    it("should throw error when no provider connects successfully", async () => {
      // Mock both Solana and Ethereum to fail
      mockPhantomObject.solana.connect.mockRejectedValue(new Error("Provider not found."));
      mockPhantomObject.ethereum.connect.mockRejectedValue(new Error("Provider not found."));
      
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const { createPhantom } = require("@phantom/browser-injected-sdk");
      createPhantom.mockReturnValue(mockPhantomObject);

      const provider = new InjectedProvider({
        solanaProvider: "web3js",
        addressTypes: [AddressType.solana, AddressType.ethereum],
      });

      await expect(provider.connect()).rejects.toThrow("Failed to connect to any supported wallet provider");
    });
  });

  describe("disconnect", () => {
    it("should disconnect from providers", async () => {
      const provider = new InjectedProvider({
        solanaProvider: "web3js",
        addressTypes: [AddressType.solana, AddressType.ethereum],
      });

      // First connect - already mocked in beforeEach
      await provider.connect();

      // Then disconnect
      await provider.disconnect();

      expect(provider.isConnected()).toBe(false);
      expect(provider.getAddresses()).toEqual([]);
    });
  });

  describe("signMessage", () => {
    let provider: InjectedProvider;

    beforeEach(async () => {
      provider = new InjectedProvider({
        solanaProvider: "web3js",
        addressTypes: [AddressType.solana, AddressType.ethereum],
      });

      await provider.connect();
    });

    it("should sign message with Solana", async () => {
      const message = "Hello Phantom!";

      const result = await provider.solana.signMessage(message);

      expect(mockPhantomObject.solana.signMessage).toHaveBeenCalled();
      expect(result).toEqual({
        signature: expect.any(Uint8Array),
        publicKey: expect.any(String),
      });
    });

    it("should sign message with Ethereum", async () => {
      const message = "Hello Ethereum!";
      const address = "0x742d35Cc6634C0532925a3b844Bc9e7595f6cE65";
      const mockSignature = "mock-eth-signature";

      const result = await provider.ethereum.signPersonalMessage(message, address);

      expect(mockPhantomObject.ethereum.signPersonalMessage).toHaveBeenCalledWith(message, address);
      expect(result).toBe(mockSignature);
    });

    it("should work when not connected with mock", async () => {
      const disconnectedProvider = new InjectedProvider({
        solanaProvider: "web3js",
        addressTypes: [AddressType.solana, AddressType.ethereum],
      });
      // Provider is not connected, but mocked solana will still work
      const result = await disconnectedProvider.solana.signMessage("test");
      expect(result).toEqual({
        signature: expect.any(Uint8Array),
        publicKey: "",
      });
    });
  });

  describe("signAndSendTransaction", () => {
    let provider: InjectedProvider;

    beforeEach(async () => {
      provider = new InjectedProvider({
        solanaProvider: "web3js",
        addressTypes: [AddressType.solana, AddressType.ethereum],
      });

      await provider.connect();
    });

    it("should sign and send Solana transaction", async () => {
      const mockTransaction = { messageBytes: new Uint8Array([1, 2, 3, 4, 5]) };
      const mockSignature = "mock-transaction-signature";

      const result = await provider.solana.signAndSendTransaction(mockTransaction);

      expect(mockPhantomObject.solana.signAndSendTransaction).toHaveBeenCalledWith(mockTransaction);
      expect(result).toEqual({
        signature: mockSignature,
      });
    });

    it("should sign and send Ethereum transaction", async () => {
      const mockTransaction = {
        to: "0x742d35Cc6634C0532925a3b844Bc9e7595f6cE65",
        value: "0x1000000000000000000",
        gas: "0x5208",
      };
      const mockTxHash = "mock-tx-hash";

      const result = await provider.ethereum.sendTransaction(mockTransaction);

      expect(mockPhantomObject.ethereum.sendTransaction).toHaveBeenCalledWith(mockTransaction);
      expect(result).toBe(mockTxHash);
    });

    it("should work when not connected with mock", async () => {
      const disconnectedProvider = new InjectedProvider({
        solanaProvider: "web3js",
        addressTypes: [AddressType.solana, AddressType.ethereum],
      });

      // With mocked phantom object, this will succeed
      const result = await disconnectedProvider.solana.signAndSendTransaction({
        messageBytes: new Uint8Array([1, 2, 3]),
      });
      expect(result.signature).toBe("mock-transaction-signature");
    });
  });

  describe("getAddresses", () => {
    it("should return empty array when not connected", () => {
      const provider = new InjectedProvider({
        solanaProvider: "web3js",
        addressTypes: [AddressType.solana, AddressType.ethereum],
      });
      const addresses = provider.getAddresses();
      expect(addresses).toEqual([]);
    });

    it("should return addresses after connection", async () => {
      const provider = new InjectedProvider({
        solanaProvider: "web3js",
        addressTypes: [AddressType.solana, AddressType.ethereum],
      });

      await provider.connect();
      const addresses = provider.getAddresses();

      expect(addresses).toHaveLength(1);
      expect(addresses[0].address).toBe("GfJ4JhQXbUMwh7x8e7YFHC3yLz5FJGvjurQrNxFWkeYH");
    });
  });

  describe("isConnected", () => {
    it("should return false initially", () => {
      const provider = new InjectedProvider({
        solanaProvider: "web3js",
        addressTypes: [AddressType.solana, AddressType.ethereum],
      });
      expect(provider.isConnected()).toBe(false);
    });

    it("should return true after connection", async () => {
      const provider = new InjectedProvider({
        solanaProvider: "web3js",
        addressTypes: [AddressType.solana, AddressType.ethereum],
      });

      await provider.connect();
      expect(provider.isConnected()).toBe(true);
    });

    it("should return false after disconnection", async () => {
      const provider = new InjectedProvider({
        solanaProvider: "web3js",
        addressTypes: [AddressType.solana, AddressType.ethereum],
      });

      await provider.connect();
      await provider.disconnect();
      expect(provider.isConnected()).toBe(false);
    });
  });
});
