import { InjectedWalletEthereumChain } from "./InjectedWalletEthereumChain";
import type { IEthereumChain } from "@phantom/chain-interfaces";

describe("InjectedWalletEthereumChain", () => {
  let mockProvider: IEthereumChain;
  let ethereumChain: InjectedWalletEthereumChain;
  let eventListeners: Map<string, any[]>;

  beforeEach(() => {
    eventListeners = new Map<string, any[]>();

    // Create mock provider
    mockProvider = {
      request: jest.fn(),
      connect: jest.fn().mockResolvedValue(["0x1234567890abcdef1234567890abcdef12345678"]),
      disconnect: jest.fn().mockResolvedValue(undefined),
      signPersonalMessage: jest.fn(),
      signTypedData: jest.fn(),
      signTransaction: jest.fn(),
      sendTransaction: jest.fn(),
      switchChain: jest.fn(),
      getChainId: jest.fn().mockResolvedValue(1),
      getAccounts: jest.fn().mockResolvedValue(["0x1234567890abcdef1234567890abcdef12345678"]),
      isConnected: jest.fn().mockReturnValue(false),
      connected: false,
      chainId: "0x1",
      accounts: [],
      on: jest.fn((event: string, listener: any) => {
        if (!eventListeners.has(event)) {
          eventListeners.set(event, []);
        }
        eventListeners.get(event)?.push(listener);
      }),
      off: jest.fn(),
    };

    ethereumChain = new InjectedWalletEthereumChain(mockProvider, "test-wallet", "Test Wallet");
  });

  afterEach(() => {
    jest.clearAllMocks();
    eventListeners.clear();
  });

  describe("constructor", () => {
    it("should initialize with provider, walletId, and walletName", () => {
      expect(ethereumChain).toBeDefined();
      expect((ethereumChain as any).provider).toBe(mockProvider);
      expect((ethereumChain as any).walletId).toBe("test-wallet");
      expect((ethereumChain as any).walletName).toBe("Test Wallet");
    });

    it("should set up event listeners", () => {
      expect(mockProvider.on).toHaveBeenCalledWith("connect", expect.any(Function));
      expect(mockProvider.on).toHaveBeenCalledWith("disconnect", expect.any(Function));
      expect(mockProvider.on).toHaveBeenCalledWith("accountsChanged", expect.any(Function));
      expect(mockProvider.on).toHaveBeenCalledWith("chainChanged", expect.any(Function));
    });

    it("should have initial disconnected state", () => {
      expect(ethereumChain.connected).toBe(false);
      expect(ethereumChain.accounts).toEqual([]);
    });
  });

  describe("accountsChanged event handling", () => {
    it("should update accounts and set connected to true when accounts are provided", () => {
      const newAccounts = ["0x742d35Cc6634C0532925a3b8D4C8db86fB5C4A7E"];
      const accountsChangedListener = eventListeners.get("accountsChanged")?.[0];

      expect(accountsChangedListener).toBeDefined();

      // Call the accountsChanged listener
      accountsChangedListener(newAccounts);

      expect(ethereumChain.accounts).toEqual(newAccounts);
      expect(ethereumChain.connected).toBe(true);
      expect((ethereumChain as any)._connected).toBe(true);
    });

    it("should update accounts and set connected to false when accounts array is empty", () => {
      // First set some accounts
      const initialAccounts = ["0x1234567890abcdef1234567890abcdef12345678"];
      const accountsChangedListener = eventListeners.get("accountsChanged")?.[0];
      accountsChangedListener(initialAccounts);
      expect(ethereumChain.connected).toBe(true);

      // Then clear accounts
      accountsChangedListener([]);

      expect(ethereumChain.accounts).toEqual([]);
      expect(ethereumChain.connected).toBe(false);
      expect((ethereumChain as any)._connected).toBe(false);
    });

    it("should emit accountsChanged event when provider emits accountsChanged", () => {
      const listener = jest.fn();
      ethereumChain.on("accountsChanged", listener);

      const newAccounts = ["0x742d35Cc6634C0532925a3b8D4C8db86fB5C4A7E"];
      const accountsChangedListener = eventListeners.get("accountsChanged")?.[0];
      accountsChangedListener(newAccounts);

      expect(listener).toHaveBeenCalledWith(newAccounts);
    });

    it("should handle multiple accounts", () => {
      const multipleAccounts = [
        "0x742d35Cc6634C0532925a3b8D4C8db86fB5C4A7E",
        "0x8ba1f109551bD432803012645Hac136c22C19e00",
      ];
      const accountsChangedListener = eventListeners.get("accountsChanged")?.[0];

      accountsChangedListener(multipleAccounts);

      expect(ethereumChain.accounts).toEqual(multipleAccounts);
      expect(ethereumChain.connected).toBe(true);
    });

    it("should update connection state when switching from no accounts to accounts", () => {
      const accountsChangedListener = eventListeners.get("accountsChanged")?.[0];

      // Start with no accounts
      expect(ethereumChain.connected).toBe(false);

      // Switch to connected account
      const newAccounts = ["0x742d35Cc6634C0532925a3b8D4C8db86fB5C4A7E"];
      accountsChangedListener(newAccounts);

      expect(ethereumChain.connected).toBe(true);
      expect(ethereumChain.accounts).toEqual(newAccounts);
    });
  });

  describe("connect event handling", () => {
    it("should update connected state and chainId when connect event is received", () => {
      const connectListener = eventListeners.get("connect")?.[0];
      const connectInfo = { chainId: "0x89" };

      connectListener(connectInfo);

      expect(ethereumChain.connected).toBe(true);
      expect(ethereumChain.chainId).toBe("0x89");
      expect((ethereumChain as any)._connected).toBe(true);
      expect((ethereumChain as any)._chainId).toBe("0x89");
    });
  });

  describe("disconnect event handling", () => {
    it("should update connected state and clear accounts when disconnect event is received", () => {
      // First connect
      const accountsChangedListener = eventListeners.get("accountsChanged")?.[0];
      accountsChangedListener(["0x1234567890abcdef1234567890abcdef12345678"]);
      expect(ethereumChain.connected).toBe(true);

      // Then disconnect
      const disconnectListener = eventListeners.get("disconnect")?.[0];
      disconnectListener({ code: 4900, message: "Provider disconnected" });

      expect(ethereumChain.connected).toBe(false);
      expect(ethereumChain.accounts).toEqual([]);
      expect((ethereumChain as any)._connected).toBe(false);
    });
  });

  describe("chainChanged event handling", () => {
    it("should update chainId when chainChanged event is received", () => {
      const chainChangedListener = eventListeners.get("chainChanged")?.[0];

      chainChangedListener("0x89");

      expect(ethereumChain.chainId).toBe("0x89");
      expect((ethereumChain as any)._chainId).toBe("0x89");
    });
  });
});
