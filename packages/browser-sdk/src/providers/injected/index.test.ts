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

    // Set up window.phantom mock with app.getUser support
    setupWindowMock({
      solana: mockSolanaProvider,
      ethereum: mockEthereumProvider,
      app: {
        getUser: jest.fn().mockResolvedValue({ authUserId: "test-auth-user-id" }),
        login: jest.fn(),
        features: jest.fn(),
      },
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
        addressTypes: [AddressType.solana, AddressType.ethereum],
      });

      const result = await provider.connect({ provider: "injected" });

      expect(result.addresses).toHaveLength(1);
      expect(result.addresses[0]).toEqual({
        addressType: AddressType.solana,
        address: mockPublicKey,
      });
      expect(result.authUserId).toBe("test-auth-user-id");
      expect(provider.isConnected()).toBe(true);
    });

    it("should connect to Ethereum wallet when only Ethereum is enabled", async () => {
      const mockAddresses = ["0x742d35Cc6634C0532925a3b844Bc9e7595f6cE65"];

      mockPhantomObject.ethereum.connect.mockResolvedValue(mockAddresses);

      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const { createPhantom } = require("@phantom/browser-injected-sdk");
      createPhantom.mockReturnValue(mockPhantomObject);

      const provider = new InjectedProvider({
        addressTypes: [AddressType.ethereum], // Only Ethereum enabled
      });

      const result = await provider.connect({ provider: "injected" });

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
        addressTypes: [AddressType.solana, AddressType.ethereum],
      });

      await expect(provider.connect({ provider: "injected" })).rejects.toThrow("Phantom wallet not found");
    });

    it("should throw error when connection fails", async () => {
      // Mock Solana to fail - should stop immediately without trying Ethereum
      mockPhantomObject.solana.connect.mockRejectedValue(new Error("Provider not found."));

      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const { createPhantom } = require("@phantom/browser-injected-sdk");
      createPhantom.mockReturnValue(mockPhantomObject);

      const provider = new InjectedProvider({
        addressTypes: [AddressType.solana, AddressType.ethereum],
      });

      await expect(provider.connect({ provider: "injected" })).rejects.toThrow("Provider not found.");

      // Ethereum connect should not have been called since Solana failed first
      expect(mockPhantomObject.ethereum.connect).not.toHaveBeenCalled();
    });
  });

  describe("disconnect", () => {
    it("should disconnect from providers", async () => {
      const provider = new InjectedProvider({
        addressTypes: [AddressType.solana, AddressType.ethereum],
      });

      // First connect - already mocked in beforeEach
      await provider.connect({ provider: "injected" });

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
        addressTypes: [AddressType.solana, AddressType.ethereum],
      });

      await provider.connect({ provider: "injected" });
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
        addressTypes: [AddressType.solana, AddressType.ethereum],
      });

      await provider.connect({ provider: "injected" });
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
        addressTypes: [AddressType.solana, AddressType.ethereum],
      });
      const addresses = provider.getAddresses();
      expect(addresses).toEqual([]);
    });

    it("should return addresses after connection", async () => {
      const provider = new InjectedProvider({
        addressTypes: [AddressType.solana, AddressType.ethereum],
      });

      await provider.connect({ provider: "injected" });
      const addresses = provider.getAddresses();

      expect(addresses).toHaveLength(1);
      expect(addresses[0].address).toBe("GfJ4JhQXbUMwh7x8e7YFHC3yLz5FJGvjurQrNxFWkeYH");
    });
  });

  describe("isConnected", () => {
    it("should return false initially", () => {
      const provider = new InjectedProvider({
        addressTypes: [AddressType.solana, AddressType.ethereum],
      });
      expect(provider.isConnected()).toBe(false);
    });

    it("should return true after connection", async () => {
      const provider = new InjectedProvider({
        addressTypes: [AddressType.solana, AddressType.ethereum],
      });

      await provider.connect({ provider: "injected" });
      expect(provider.isConnected()).toBe(true);
    });

    it("should return false after disconnection", async () => {
      const provider = new InjectedProvider({
        addressTypes: [AddressType.solana, AddressType.ethereum],
      });

      await provider.connect({ provider: "injected" });
      await provider.disconnect();
      expect(provider.isConnected()).toBe(false);
    });
  });

  describe("account change events", () => {
    let provider: InjectedProvider;
    let connectCallback: jest.Mock;
    let disconnectCallback: jest.Mock;

    beforeEach(async () => {
      provider = new InjectedProvider({
        addressTypes: [AddressType.solana, AddressType.ethereum],
      });

      connectCallback = jest.fn();
      disconnectCallback = jest.fn();

      provider.on("connect", connectCallback);
      provider.on("disconnect", disconnectCallback);

      // Connect initially
      await provider.connect({ provider: "injected" });
    });

    describe("Ethereum account changes", () => {
      it("should emit connect event when switching to a connected account", async () => {
        // Simulate Ethereum accountsChanged event with new addresses
        const newAccounts = ["0x742d35Cc6634C0532925a3b8D4C8db86fB5C4A7E"];

        // Find and call the Ethereum accountsChanged handler that was set up
        const addEventListenerCalls = mockPhantomObject.ethereum.addEventListener.mock.calls;
        const accountsChangedCall = addEventListenerCalls.find(call => call[0] === "accountsChanged");
        expect(accountsChangedCall).toBeDefined();

        const accountsChangedHandler = accountsChangedCall[1];
        await accountsChangedHandler(newAccounts);

        // Should emit connect event with new addresses
        expect(connectCallback).toHaveBeenCalledWith({
          addresses: [
            { addressType: AddressType.solana, address: "GfJ4JhQXbUMwh7x8e7YFHC3yLz5FJGvjurQrNxFWkeYH" },
            { addressType: AddressType.ethereum, address: newAccounts[0] }
          ],
          source: "injected-extension-account-change",
          authUserId: "test-auth-user-id",
        });
        expect(disconnectCallback).not.toHaveBeenCalled();
      });

      it("should emit disconnect event when switching to unconnected account", () => {
        // Reset mock calls from initial connection
        connectCallback.mockClear();
        disconnectCallback.mockClear();

        // Simulate Ethereum accountsChanged event with empty accounts array
        const emptyAccounts: string[] = [];

        // Find and call the Ethereum accountsChanged handler
        const addEventListenerCalls = mockPhantomObject.ethereum.addEventListener.mock.calls;
        const accountsChangedCall = addEventListenerCalls.find(call => call[0] === "accountsChanged");
        expect(accountsChangedCall).toBeDefined();

        const accountsChangedHandler = accountsChangedCall[1];
        accountsChangedHandler(emptyAccounts);

        // Should emit disconnect event (not connect with empty addresses)
        expect(disconnectCallback).toHaveBeenCalledWith({
          source: "injected-extension-account-change",
        });
        expect(connectCallback).not.toHaveBeenCalled();
      });

      it("should keep Solana connection when Ethereum switches to unconnected", () => {
        // Reset mock calls from initial connection
        connectCallback.mockClear();
        disconnectCallback.mockClear();

        // Simulate Ethereum accountsChanged event with empty accounts
        const emptyAccounts: string[] = [];

        const addEventListenerCalls = mockPhantomObject.ethereum.addEventListener.mock.calls;
        const accountsChangedCall = addEventListenerCalls.find(call => call[0] === "accountsChanged");
        const accountsChangedHandler = accountsChangedCall[1];
        accountsChangedHandler(emptyAccounts);

        // Provider should still be connected (because Solana is still connected)
        expect(provider.isConnected()).toBe(false);
        expect(provider.getAddresses()).toEqual([{
          addressType: AddressType.solana,
          address: "GfJ4JhQXbUMwh7x8e7YFHC3yLz5FJGvjurQrNxFWkeYH"
        }]);
      });
    });

    describe("Solana account changes", () => {
      it("should emit connect event when switching to different Solana account", async () => {
        // Reset mock calls from initial connection
        connectCallback.mockClear();
        disconnectCallback.mockClear();

        // Simulate Solana accountChanged event with new public key
        const newPublicKey = "DifferentSolanaPublicKeyHere123456789ABCDEF";

        // Find and call the Solana accountChanged handler that was registered with browser-injected-SDK
        const addEventListenerCalls = mockPhantomObject.solana.addEventListener.mock.calls;

        // There might be multiple accountChanged listeners, get the last one (most recent)
        const accountChangedCalls = addEventListenerCalls.filter(call => call[0] === "accountChanged");
        expect(accountChangedCalls.length).toBeGreaterThan(0);

        const accountChangedCall = accountChangedCalls[accountChangedCalls.length - 1]; // Use the last one
        const accountChangedHandler = accountChangedCall[1];
        await accountChangedHandler(newPublicKey);

        // Should emit connect event with updated Solana address (but no Ethereum addresses since not added during initial connect)
        expect(connectCallback).toHaveBeenCalledWith({
          addresses: [
            { addressType: AddressType.solana, address: newPublicKey }
          ],
          source: "injected-extension-account-change",
          authUserId: "test-auth-user-id",
        });
        expect(disconnectCallback).not.toHaveBeenCalled();

        // Verify the provider state was updated
        expect(provider.getAddresses()).toEqual([
          { addressType: AddressType.solana, address: newPublicKey }
        ]);
      });
    });
  });
});
