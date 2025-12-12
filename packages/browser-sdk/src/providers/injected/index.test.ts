import { InjectedProvider } from "./index";
import { AddressType } from "@phantom/client";
import { createMockSolanaProvider, createMockEthereumProvider, setupWindowMock } from "../../test-utils/mockWindow";
import { getWalletRegistry } from "../../wallets/registry";

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
        connect: jest.fn().mockResolvedValue(["0x1234567890123456789012345678901234567890"]),
        disconnect: jest.fn(),
        getAccounts: jest.fn().mockResolvedValue(["0x1234567890123456789012345678901234567890"]),
        signMessage: jest.fn(),
        signPersonalMessage: jest.fn().mockResolvedValue("mock-eth-signature"),
        signTypedData: jest.fn().mockResolvedValue("mock-typed-data-signature"),
        signIn: jest.fn(),
        sendTransaction: jest.fn().mockResolvedValue("mock-tx-hash"),
        signTransaction: jest.fn(),
        getChainId: jest.fn().mockResolvedValue("0x1"),
        switchChain: jest.fn(),
        request: jest.fn().mockImplementation((args: any) => {
          if (args.method === "eth_requestAccounts" || args.method === "eth_accounts") {
            return Promise.resolve(["0x1234567890123456789012345678901234567890"]);
          }
          return Promise.resolve(null);
        }),
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

    // Register Phantom in the wallet registry for tests
    const registry = getWalletRegistry();
    registry.registerPhantom(mockPhantomObject, [AddressType.solana, AddressType.ethereum]);
  });

  afterEach(() => {
    jest.clearAllMocks();
    // Clear the wallet registry after each test
    const registry = getWalletRegistry();
    registry.unregister("phantom");
  });

  describe("connect", () => {
    it("should connect to Solana wallet", async () => {
      const mockPublicKey = "GfJ4JhQXbUMwh7x8e7YFHC3yLz5FJGvjurQrNxFWkeYH";

      const provider = new InjectedProvider({
        addressTypes: [AddressType.solana],
      });

      // Register Phantom with only Solana for this test
      const registry = getWalletRegistry();
      registry.registerPhantom(mockPhantomObject, [AddressType.solana]);

      const result = await provider.connect({ provider: "injected" });

      expect(result.addresses).toHaveLength(1);
      expect(result.addresses[0]).toEqual({
        addressType: AddressType.solana,
        address: mockPublicKey,
      });
      expect(result.authUserId).toBe("test-auth-user-id");
      expect(result.wallet).toBeDefined();
      expect(result.wallet?.name).toBe("Phantom");
      expect(result.wallet?.discovery).toBe("phantom");
      expect(result.wallet?.addressTypes).toEqual([AddressType.solana]);
      expect(provider.isConnected()).toBe(true);
    });

    it("should default to Phantom wallet id when none is provided", async () => {
      const provider = new InjectedProvider({
        addressTypes: [AddressType.solana],
      });

      await provider.connect({ provider: "injected" });

      const internal = provider as any;
      expect(internal.selectedWalletId).toBe("phantom");
    });

    it("should accept an injected wallet id that exists in the registry", async () => {
      const provider = new InjectedProvider({
        addressTypes: [AddressType.solana],
      });

      // Mock ISolanaChain adapter - connect() returns { publicKey: string }
      const mockSolanaChain = {
        connect: jest.fn().mockResolvedValue({
          publicKey: "GfJ4JhQXbUMwh7x8e7YFHC3yLz5FJGvjurQrNxFWkeYH",
        }),
        disconnect: jest.fn(),
        signMessage: jest.fn(),
        signTransaction: jest.fn(),
        signAndSendTransaction: jest.fn(),
        signAllTransactions: jest.fn(),
        signAndSendAllTransactions: jest.fn(),
        switchNetwork: jest.fn(),
        getPublicKey: jest.fn(),
        isConnected: jest.fn().mockReturnValue(false),
        on: jest.fn(),
        off: jest.fn(),
        publicKey: null,
        connected: false,
      };

      const internal = provider as any;
      internal.walletRegistry.register({
        id: "other-wallet",
        name: "Other Wallet",
        icon: "https://example.com/icon.png",
        addressTypes: [AddressType.solana],
        providers: {
          solana: mockSolanaChain,
        },
        discovery: "standard",
      });

      const result = await provider.connect({ provider: "injected", walletId: "other-wallet" });

      expect(internal.selectedWalletId).toBe("other-wallet");
      expect(mockSolanaChain.connect).toHaveBeenCalled();
      expect(result.addresses).toHaveLength(1);
      expect(result.addresses[0].address).toBe("GfJ4JhQXbUMwh7x8e7YFHC3yLz5FJGvjurQrNxFWkeYH");
      expect(result.wallet).toBeDefined();
      expect(result.wallet?.name).toBe("Other Wallet");
      expect(result.wallet?.icon).toBe("https://example.com/icon.png");
      expect(result.wallet?.discovery).toBe("standard");
      expect(result.wallet?.addressTypes).toEqual([AddressType.solana]);
    });

    it("should reject when an unknown injected wallet id is requested", async () => {
      const provider = new InjectedProvider({
        addressTypes: [AddressType.solana],
      });

      await expect(provider.connect({ provider: "injected", walletId: "unknown-wallet" })).rejects.toThrow(
        "Unknown injected wallet id: unknown-wallet",
      );
    });

    it("should connect to Ethereum wallet when only Ethereum is enabled", async () => {
      const mockAddresses = ["0x742d35Cc6634C0532925a3b844Bc9e7595f6cE65"];

      // Update the mock to return the expected address
      mockPhantomObject.ethereum.getAccounts.mockResolvedValue(mockAddresses);
      mockPhantomObject.ethereum.connect.mockResolvedValue(mockAddresses);

      // Register Phantom with only Ethereum for this test
      const registry = getWalletRegistry();
      registry.registerPhantom(mockPhantomObject, [AddressType.ethereum]);

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
      // Unregister Phantom from registry
      const registry = getWalletRegistry();
      registry.unregister("phantom");

      // Mock extension as not installed
      mockPhantomObject.extension.isInstalled = () => false;

      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const { isPhantomExtensionInstalled } = require("@phantom/browser-injected-sdk");
      isPhantomExtensionInstalled.mockReturnValue(false);

      const provider = new InjectedProvider({
        addressTypes: [AddressType.solana, AddressType.ethereum],
      });

      await expect(provider.connect({ provider: "injected" })).rejects.toThrow("Unknown injected wallet id: phantom");
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
      const address = "0x1234567890123456789012345678901234567890"; // Use the address from the mock
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
      // The wrapped provider may return a publicKey even when not connected
      const result = await disconnectedProvider.solana.signMessage("test");
      expect(result).toHaveProperty("signature");
      expect(result.signature).toBeInstanceOf(Uint8Array);
      // publicKey may be empty or the mock value depending on the wrapper's state
      expect(typeof result.publicKey).toBe("string");
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
        addressTypes: [AddressType.solana],
      });

      // Register Phantom with only Solana for this test
      const registry = getWalletRegistry();
      registry.registerPhantom(mockPhantomObject, [AddressType.solana]);

      await provider.connect({ provider: "injected" });
      const addresses = provider.getAddresses();

      expect(addresses.length).toBeGreaterThan(0);
      const solanaAddress = addresses.find(addr => addr.addressType === AddressType.solana);
      expect(solanaAddress?.address).toBe("GfJ4JhQXbUMwh7x8e7YFHC3yLz5FJGvjurQrNxFWkeYH");
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
        // There might be multiple handlers (one from PhantomEthereumChain, one from InjectedProvider)
        // We want the last one which is from InjectedProvider.setupEthereumEvents
        const addEventListenerCalls = mockPhantomObject.ethereum.addEventListener.mock.calls;
        const accountsChangedCalls = addEventListenerCalls.filter((call: any[]) => call[0] === "accountsChanged");
        expect(accountsChangedCalls.length).toBeGreaterThan(0);

        // Get the last handler (from InjectedProvider)
        const accountsChangedCall = accountsChangedCalls[accountsChangedCalls.length - 1];
        const accountsChangedHandler = accountsChangedCall[1];
        await accountsChangedHandler(newAccounts);

        // Should emit connect event with new addresses
        expect(connectCallback).toHaveBeenCalledWith({
          addresses: [
            { addressType: AddressType.solana, address: "GfJ4JhQXbUMwh7x8e7YFHC3yLz5FJGvjurQrNxFWkeYH" },
            { addressType: AddressType.ethereum, address: newAccounts[0] },
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
        // Get the last one (from InjectedProvider)
        const addEventListenerCalls = mockPhantomObject.ethereum.addEventListener.mock.calls;
        const accountsChangedCalls = addEventListenerCalls.filter((call: any[]) => call[0] === "accountsChanged");
        expect(accountsChangedCalls.length).toBeGreaterThan(0);

        const accountsChangedCall = accountsChangedCalls[accountsChangedCalls.length - 1];
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
        const accountsChangedCalls = addEventListenerCalls.filter((call: any[]) => call[0] === "accountsChanged");
        expect(accountsChangedCalls.length).toBeGreaterThan(0);
        // Get the last handler (from InjectedProvider)
        const accountsChangedCall = accountsChangedCalls[accountsChangedCalls.length - 1];
        const accountsChangedHandler = accountsChangedCall[1];
        accountsChangedHandler(emptyAccounts);

        // Provider should still be connected (because Solana is still connected)
        expect(provider.isConnected()).toBe(true);
        expect(provider.getAddresses()).toEqual([
          {
            addressType: AddressType.solana,
            address: "GfJ4JhQXbUMwh7x8e7YFHC3yLz5FJGvjurQrNxFWkeYH",
          },
        ]);
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
        // There might be multiple accountChanged listeners:
        // 1. One from PhantomSolanaChain.setupEventListeners (first)
        // 2. One from InjectedProvider.setupSolanaEvents (last - this is what we want)
        const addEventListenerCalls = mockPhantomObject.solana.addEventListener.mock.calls;
        const accountChangedCalls = addEventListenerCalls.filter((call: any[]) => call[0] === "accountChanged");
        expect(accountChangedCalls.length).toBeGreaterThan(0);

        // Use the last one which is from InjectedProvider.setupSolanaEvents
        const accountChangedCall = accountChangedCalls[accountChangedCalls.length - 1];
        const accountChangedHandler = accountChangedCall[1];

        // Make sure the handler is async-aware
        if (accountChangedHandler) {
          await accountChangedHandler(newPublicKey);
        } else {
          throw new Error("accountChanged handler not found");
        }

        // Should emit connect event with updated Solana address
        // Note: The event may include Ethereum addresses if they were connected during initial connect
        expect(connectCallback).toHaveBeenCalled();
        const callArgs = connectCallback.mock.calls[0][0];
        expect(callArgs.addresses).toContainEqual({ addressType: AddressType.solana, address: newPublicKey });
        expect(callArgs.source).toBe("injected-extension-account-change");
        expect(callArgs.authUserId).toBe("test-auth-user-id");
        expect(disconnectCallback).not.toHaveBeenCalled();

        // Verify the provider state was updated
        const addresses = provider.getAddresses();
        const solanaAddress = addresses.find(addr => addr.addressType === AddressType.solana);
        expect(solanaAddress?.address).toBe(newPublicKey);
      });
    });
  });

  describe("wallet info in ConnectResult", () => {
    it("should include wallet info with discovery 'phantom' for Phantom wallet", async () => {
      const provider = new InjectedProvider({
        addressTypes: [AddressType.solana],
      });

      const registry = getWalletRegistry();
      registry.registerPhantom(mockPhantomObject, [AddressType.solana]);

      const result = await provider.connect({ provider: "injected" });

      expect(result.wallet).toBeDefined();
      expect(result.wallet?.id).toBe("phantom");
      expect(result.wallet?.name).toBe("Phantom");
      expect(result.wallet?.discovery).toBe("phantom");
      expect(result.wallet?.addressTypes).toEqual([AddressType.solana]);
      expect(result.walletId).toBe("phantom");
    });

    it("should include wallet info with discovery 'standard' for Wallet Standard wallet", async () => {
      const provider = new InjectedProvider({
        addressTypes: [AddressType.solana],
      });

      // Create a proper Wallet Standard wallet mock with features
      const mockPublicKey = "GfJ4JhQXbUMwh7x8e7YFHC3yLz5FJGvjurQrNxFWkeYH";
      const mockAccount = {
        address: mockPublicKey,
        publicKey: new Uint8Array(32), // Mock public key bytes
        chains: ["solana:mainnet"],
        features: ["standard:connect"],
      };

      const mockWalletStandardWallet = {
        name: "Standard Wallet",
        icon: "https://example.com/standard.png",
        version: "1.0.0",
        chains: ["solana:mainnet"],
        features: {
          "standard:connect": {
            version: "1.0.0",
            connect: jest.fn().mockResolvedValue(undefined), // Wallet Standard may return void
          },
          "standard:signTransaction": {
            version: "1.0.0",
            signTransaction: jest.fn(),
          },
        },
        accounts: [mockAccount],
      };

      const internal = provider as any;
      internal.walletRegistry.register({
        id: "standard-wallet",
        name: "Standard Wallet",
        icon: "https://example.com/standard.png",
        addressTypes: [AddressType.solana],
        providers: {
          solana: mockWalletStandardWallet as any,
        },
        discovery: "standard",
      });

      const result = await provider.connect({ provider: "injected", walletId: "standard-wallet" });

      expect(result.wallet).toBeDefined();
      expect(result.wallet?.id).toBe("standard-wallet");
      expect(result.wallet?.name).toBe("Standard Wallet");
      expect(result.wallet?.icon).toBe("https://example.com/standard.png");
      expect(result.wallet?.discovery).toBe("standard");
      expect(result.wallet?.addressTypes).toEqual([AddressType.solana]);
      expect(result.walletId).toBe("standard-wallet");
    });

    it("should include wallet info with discovery 'eip6963' for EIP-6963 wallet", async () => {
      const provider = new InjectedProvider({
        addressTypes: [AddressType.ethereum],
      });

      const mockEthereumChain = {
        connect: jest.fn().mockResolvedValue(["0x1234567890123456789012345678901234567890"]),
        disconnect: jest.fn(),
        getAccounts: jest.fn().mockResolvedValue(["0x1234567890123456789012345678901234567890"]),
        signMessage: jest.fn(),
        signPersonalMessage: jest.fn(),
        signTypedData: jest.fn(),
        signIn: jest.fn(),
        sendTransaction: jest.fn(),
        signTransaction: jest.fn(),
        getChainId: jest.fn().mockResolvedValue("0x1"),
        switchChain: jest.fn(),
        request: jest.fn().mockImplementation((args: any) => {
          if (args.method === "eth_requestAccounts" || args.method === "eth_accounts") {
            return Promise.resolve(["0x1234567890123456789012345678901234567890"]);
          }
          return Promise.resolve(null);
        }),
        getProvider: jest.fn(),
        addEventListener: jest.fn(),
        removeEventListener: jest.fn(),
      };

      const internal = provider as any;
      internal.walletRegistry.register({
        id: "eip6963-wallet",
        name: "EIP-6963 Wallet",
        icon: "https://example.com/eip6963.png",
        addressTypes: [AddressType.ethereum],
        providers: {
          ethereum: mockEthereumChain,
        },
        rdns: "io.metamask",
        discovery: "eip6963",
      });

      const result = await provider.connect({ provider: "injected", walletId: "eip6963-wallet" });

      expect(result.wallet).toBeDefined();
      expect(result.wallet?.id).toBe("eip6963-wallet");
      expect(result.wallet?.name).toBe("EIP-6963 Wallet");
      expect(result.wallet?.icon).toBe("https://example.com/eip6963.png");
      expect(result.wallet?.discovery).toBe("eip6963");
      expect(result.wallet?.rdns).toBe("io.metamask");
      expect(result.wallet?.addressTypes).toEqual([AddressType.ethereum]);
      expect(result.walletId).toBe("eip6963-wallet");
    });
  });
});
