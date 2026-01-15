import { InjectedWalletSolanaChain } from "./InjectedWalletSolanaChain";
import type { ISolanaChain } from "@phantom/chain-interfaces";

describe("InjectedWalletSolanaChain", () => {
  let mockProvider: ISolanaChain;
  let solanaChain: InjectedWalletSolanaChain;
  let eventListeners: Map<string, any[]>;

  beforeEach(() => {
    eventListeners = new Map<string, any[]>();

    // Create mock provider
    mockProvider = {
      connect: jest.fn().mockResolvedValue({ publicKey: "GfJ4JhQXbUMwh7x8e7YFHC3yLz5FJGvjurQrNxFWkeYH" }),
      disconnect: jest.fn().mockResolvedValue(undefined),
      signMessage: jest.fn(),
      signTransaction: jest.fn(),
      signAllTransactions: jest.fn(),
      signAndSendTransaction: jest.fn(),
      signAndSendAllTransactions: jest.fn(),
      switchNetwork: jest.fn(),
      getPublicKey: jest.fn().mockResolvedValue("GfJ4JhQXbUMwh7x8e7YFHC3yLz5FJGvjurQrNxFWkeYH"),
      isConnected: jest.fn().mockReturnValue(false),
      connected: false,
      publicKey: null,
      on: jest.fn((event: string, listener: any) => {
        if (!eventListeners.has(event)) {
          eventListeners.set(event, []);
        }
        eventListeners.get(event)?.push(listener);
      }),
      off: jest.fn(),
    };

    solanaChain = new InjectedWalletSolanaChain(mockProvider, "test-wallet", "Test Wallet");
  });

  afterEach(() => {
    jest.clearAllMocks();
    eventListeners.clear();
  });

  describe("constructor", () => {
    it("should initialize with provider, walletId, and walletName", () => {
      expect(solanaChain).toBeDefined();
      expect((solanaChain as any).provider).toBe(mockProvider);
      expect((solanaChain as any).walletId).toBe("test-wallet");
      expect((solanaChain as any).walletName).toBe("Test Wallet");
    });

    it("should set up event listeners", () => {
      expect(mockProvider.on).toHaveBeenCalledWith("connect", expect.any(Function));
      expect(mockProvider.on).toHaveBeenCalledWith("disconnect", expect.any(Function));
      expect(mockProvider.on).toHaveBeenCalledWith("accountChanged", expect.any(Function));
    });

    it("should have initial disconnected state", () => {
      expect(solanaChain.connected).toBe(false);
      expect(solanaChain.publicKey).toBeNull();
    });
  });

  describe("accountChanged event handling", () => {
    it("should update publicKey and set connected to true when valid publicKey is provided", () => {
      const newPublicKey = "GfJ4JhQXbUMwh7x8e7YFHC3yLz5FJGvjurQrNxFWkeYH";
      const accountChangedListener = eventListeners.get("accountChanged")?.[0];

      expect(accountChangedListener).toBeDefined();

      // Call the accountChanged listener
      accountChangedListener(newPublicKey);

      expect(solanaChain.publicKey).toBe(newPublicKey);
      expect(solanaChain.connected).toBe(true);
      expect((solanaChain as any)._connected).toBe(true);
      expect((solanaChain as any)._publicKey).toBe(newPublicKey);
    });

    it("should set connected to false when publicKey is null", () => {
      // First set a publicKey
      const initialPublicKey = "GfJ4JhQXbUMwh7x8e7YFHC3yLz5FJGvjurQrNxFWkeYH";
      const accountChangedListener = eventListeners.get("accountChanged")?.[0];
      accountChangedListener(initialPublicKey);
      expect(solanaChain.connected).toBe(true);

      // Then set to null
      accountChangedListener(null as any);

      expect(solanaChain.publicKey).toBeNull();
      expect(solanaChain.connected).toBe(false);
      expect((solanaChain as any)._connected).toBe(false);
    });

    it("should set connected to false when publicKey is empty string", () => {
      // First set a publicKey
      const initialPublicKey = "GfJ4JhQXbUMwh7x8e7YFHC3yLz5FJGvjurQrNxFWkeYH";
      const accountChangedListener = eventListeners.get("accountChanged")?.[0];
      accountChangedListener(initialPublicKey);
      expect(solanaChain.connected).toBe(true);

      // Then set to empty string
      accountChangedListener("");

      expect(solanaChain.publicKey).toBe("");
      expect(solanaChain.connected).toBe(false);
      expect((solanaChain as any)._connected).toBe(false);
    });

    it("should emit accountChanged event when provider emits accountChanged", () => {
      const listener = jest.fn();
      solanaChain.on("accountChanged", listener);

      const newPublicKey = "GfJ4JhQXbUMwh7x8e7YFHC3yLz5FJGvjurQrNxFWkeYH";
      const accountChangedListener = eventListeners.get("accountChanged")?.[0];
      accountChangedListener(newPublicKey);

      expect(listener).toHaveBeenCalledWith(newPublicKey);
    });

    it("should update connection state when switching from no account to account", () => {
      const accountChangedListener = eventListeners.get("accountChanged")?.[0];

      // Start with no account
      expect(solanaChain.connected).toBe(false);
      expect(solanaChain.publicKey).toBeNull();

      // Switch to connected account
      const newPublicKey = "GfJ4JhQXbUMwh7x8e7YFHC3yLz5FJGvjurQrNxFWkeYH";
      accountChangedListener(newPublicKey);

      expect(solanaChain.connected).toBe(true);
      expect(solanaChain.publicKey).toBe(newPublicKey);
    });

    it("should handle switching between different accounts", () => {
      const accountChangedListener = eventListeners.get("accountChanged")?.[0];

      // First account
      const firstPublicKey = "GfJ4JhQXbUMwh7x8e7YFHC3yLz5FJGvjurQrNxFWkeYH";
      accountChangedListener(firstPublicKey);
      expect(solanaChain.publicKey).toBe(firstPublicKey);
      expect(solanaChain.connected).toBe(true);

      // Switch to different account
      const secondPublicKey = "DifferentSolanaPublicKeyHere123456789ABCDEF";
      accountChangedListener(secondPublicKey);

      expect(solanaChain.publicKey).toBe(secondPublicKey);
      expect(solanaChain.connected).toBe(true);
      expect((solanaChain as any)._publicKey).toBe(secondPublicKey);
    });
  });

  describe("connect event handling", () => {
    it("should update connected state and publicKey when connect event is received", () => {
      const connectListener = eventListeners.get("connect")?.[0];
      const publicKey = "GfJ4JhQXbUMwh7x8e7YFHC3yLz5FJGvjurQrNxFWkeYH";

      connectListener(publicKey);

      expect(solanaChain.connected).toBe(true);
      expect(solanaChain.publicKey).toBe(publicKey);
      expect((solanaChain as any)._connected).toBe(true);
      expect((solanaChain as any)._publicKey).toBe(publicKey);
    });
  });

  describe("disconnect event handling", () => {
    it("should update connected state and clear publicKey when disconnect event is received", () => {
      // First connect
      const accountChangedListener = eventListeners.get("accountChanged")?.[0];
      accountChangedListener("GfJ4JhQXbUMwh7x8e7YFHC3yLz5FJGvjurQrNxFWkeYH");
      expect(solanaChain.connected).toBe(true);

      // Then disconnect
      const disconnectListener = eventListeners.get("disconnect")?.[0];
      disconnectListener();

      expect(solanaChain.connected).toBe(false);
      expect(solanaChain.publicKey).toBeNull();
      expect((solanaChain as any)._connected).toBe(false);
      expect((solanaChain as any)._publicKey).toBeNull();
    });
  });
});
