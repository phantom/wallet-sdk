import { PhantomSolanaChain } from "./SolanaChain";
import { AddressType } from "@phantom/client";
import { InjectedWalletRegistry } from "../../../wallets/registry";
import { Transaction, VersionedTransaction } from "@phantom/sdk-types";

describe("PhantomSolanaChain", () => {
  let mockPhantom: any;
  let walletRegistry: InjectedWalletRegistry;
  let solanaChain: PhantomSolanaChain;
  const testPublicKey = "Exb31jgzHxCJokKdeCkbCNEX6buTZxEFLXCaUWXe4VSM";

  beforeEach(() => {
    // Store event listeners for testing
    const eventListeners = new Map<string, any[]>();

    // Create mock Phantom object
    mockPhantom = {
      extension: {
        isInstalled: () => true,
      },
      solana: {
        connect: jest.fn().mockResolvedValue(testPublicKey),
        disconnect: jest.fn().mockResolvedValue(undefined),
        signMessage: jest.fn().mockResolvedValue({
          signature: new Uint8Array(64).fill(146),
        }),
        signTransaction: jest.fn().mockResolvedValue({} as Transaction),
        signAndSendTransaction: jest.fn().mockResolvedValue({
          signature: "5j7s8K9mN0pQ1rS2tU3vW4xY5zA6bC7dE8fG9hI0jK1lM2nO3pQ4rS5tU6vW7xY8z",
        }),
        signAllTransactions: jest.fn().mockResolvedValue([{} as Transaction, {} as Transaction]),
        signAndSendAllTransactions: jest.fn().mockResolvedValue({
          signatures: ["sig1", "sig2"],
        }),
        addEventListener: jest.fn((event: string, listener: any) => {
          if (!eventListeners.has(event)) {
            eventListeners.set(event, []);
          }
          eventListeners.get(event)!.push(listener);
          return () => {
            const listeners = eventListeners.get(event);
            if (listeners) {
              const index = listeners.indexOf(listener);
              if (index > -1) {
                listeners.splice(index, 1);
              }
            }
          };
        }),
        removeEventListener: jest.fn(),
        isConnected: false,
        publicKey: null,
      },
    };

    // Store eventListeners on mockPhantom for test access
    (mockPhantom.solana as any)._eventListeners = eventListeners;

    // Create wallet registry and register Phantom wallet
    walletRegistry = new InjectedWalletRegistry();
    walletRegistry.registerPhantom(mockPhantom, [AddressType.solana]);

    solanaChain = new PhantomSolanaChain(mockPhantom, "phantom", walletRegistry);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe("constructor", () => {
    it("should initialize with phantom, walletId, and walletRegistry", () => {
      expect(solanaChain).toBeDefined();
      expect((solanaChain as any).phantom).toBe(mockPhantom);
      expect((solanaChain as any).walletId).toBe("phantom");
      expect((solanaChain as any).walletRegistry).toBe(walletRegistry);
    });

    it("should set up event listeners", () => {
      expect(mockPhantom.solana.addEventListener).toHaveBeenCalled();
    });

    it("should sync initial state", () => {
      // Initial state should be synced from registry
      expect(solanaChain.connected).toBe(false);
    });
  });

  describe("connected property", () => {
    it("should return connection state from registry", () => {
      expect(solanaChain.connected).toBe(false);

      walletRegistry.setWalletConnected("phantom", true);
      expect(solanaChain.connected).toBe(true);
    });
  });

  describe("publicKey property", () => {
    it("should return publicKey from internal state", () => {
      expect(solanaChain.publicKey).toBeNull();

      (solanaChain as any)._publicKey = testPublicKey;
      expect(solanaChain.publicKey).toBe(testPublicKey);
    });
  });

  describe("connect", () => {
    it("should connect to Phantom and update registry", async () => {
      const result = await solanaChain.connect();

      expect(mockPhantom.solana.connect).toHaveBeenCalled();
      expect(result.publicKey).toBe(testPublicKey);
      expect(walletRegistry.isWalletConnected("phantom")).toBe(true);
      expect(walletRegistry.getWalletAddresses("phantom")).toContainEqual({
        addressType: AddressType.solana,
        address: testPublicKey,
      });
      expect(solanaChain.publicKey).toBe(testPublicKey);
    });

    it("should handle connect with onlyIfTrusted option", async () => {
      await solanaChain.connect({ onlyIfTrusted: true });

      expect(mockPhantom.solana.connect).toHaveBeenCalledWith({ onlyIfTrusted: true });
    });

    it("should handle string result from connect", async () => {
      mockPhantom.solana.connect.mockResolvedValue(testPublicKey);

      const result = await solanaChain.connect();

      expect(result.publicKey).toBe(testPublicKey);
    });

    it("should handle object result with publicKey property", async () => {
      mockPhantom.solana.connect.mockResolvedValue({ publicKey: testPublicKey });

      const result = await solanaChain.connect();

      expect(result.publicKey).toBe(testPublicKey);
    });

    it("should throw error if connect fails", async () => {
      mockPhantom.solana.connect.mockResolvedValue(null);

      await expect(solanaChain.connect()).rejects.toThrow("Failed to connect to Solana wallet");
    });

    it("should update existing Solana address if already exists", async () => {
      walletRegistry.setWalletAddresses("phantom", [
        { addressType: AddressType.solana, address: "old-address" },
      ]);

      await solanaChain.connect();

      const addresses = walletRegistry.getWalletAddresses("phantom");
      const solanaAddress = addresses.find((a) => a.addressType === AddressType.solana);
      expect(solanaAddress?.address).toBe(testPublicKey);
      expect(addresses.filter((a) => a.addressType === AddressType.solana).length).toBe(1);
    });
  });

  describe("disconnect", () => {
    beforeEach(async () => {
      await solanaChain.connect();
      walletRegistry.setWalletAddresses("phantom", [
        { addressType: AddressType.solana, address: testPublicKey },
      ]);
    });

    it("should disconnect from Phantom and clear registry for multi-chain wallet", async () => {
      // Register as multi-chain wallet
      const multiChainWallet = walletRegistry.getById("phantom");
      if (multiChainWallet) {
        multiChainWallet.addressTypes = [AddressType.solana, AddressType.ethereum];
      }

      await solanaChain.disconnect();

      expect(mockPhantom.solana.disconnect).toHaveBeenCalled();
      expect(walletRegistry.isWalletConnected("phantom")).toBe(false);
      expect(walletRegistry.getWalletAddresses("phantom")).toEqual([]);
      expect(solanaChain.publicKey).toBeNull();
    });

    it("should only clear Solana addresses for single-chain wallet", async () => {
      // Register as single-chain wallet
      const singleChainWallet = walletRegistry.getById("phantom");
      if (singleChainWallet) {
        singleChainWallet.addressTypes = [AddressType.solana];
      }

      walletRegistry.setWalletAddresses("phantom", [
        { addressType: AddressType.solana, address: testPublicKey },
        { addressType: AddressType.ethereum, address: "0x123" },
      ]);

      await solanaChain.disconnect();

      expect(mockPhantom.solana.disconnect).toHaveBeenCalled();
      const addresses = walletRegistry.getWalletAddresses("phantom");
      expect(addresses).not.toContainEqual({
        addressType: AddressType.solana,
        address: testPublicKey,
      });
      expect(addresses).toContainEqual({
        addressType: AddressType.ethereum,
        address: "0x123",
      });
    });
  });

  describe("signMessage", () => {
    beforeEach(async () => {
      await solanaChain.connect();
    });

    it("should sign message using Phantom solana provider", async () => {
      const message = "Hello from Phantom SDK!";
      const result = await solanaChain.signMessage(message);

      expect(mockPhantom.solana.signMessage).toHaveBeenCalledWith(
        new TextEncoder().encode(message),
      );
      expect(result.signature).toBeInstanceOf(Uint8Array);
      expect(result.publicKey).toBe(testPublicKey);
    });

    it("should handle Uint8Array message", async () => {
      const messageBytes = new Uint8Array([72, 101, 108, 108, 111]);
      const result = await solanaChain.signMessage(messageBytes);

      expect(mockPhantom.solana.signMessage).toHaveBeenCalledWith(messageBytes);
      expect(result.signature).toBeInstanceOf(Uint8Array);
    });

    it("should handle signature as Uint8Array", async () => {
      const signature = new Uint8Array(64).fill(146);
      mockPhantom.solana.signMessage.mockResolvedValue({ signature });

      const result = await solanaChain.signMessage("Hello");

      expect(result.signature).toBe(signature);
    });

    it("should handle signature as base64 string", async () => {
      const signatureBytes = new Uint8Array([1, 2, 3, 4, 5]);
      const base64Signature = Buffer.from(signatureBytes).toString("base64");
      mockPhantom.solana.signMessage.mockResolvedValue({ signature: base64Signature });

      const result = await solanaChain.signMessage("Hello");

      expect(result.signature).toBeInstanceOf(Uint8Array);
      expect(result.signature).toEqual(signatureBytes);
    });
  });

  describe("signTransaction", () => {
    let mockTransaction: Transaction;

    beforeEach(async () => {
      await solanaChain.connect();
      mockTransaction = {} as Transaction;
    });

    it("should sign transaction when connected", async () => {
      const result = await solanaChain.signTransaction(mockTransaction);

      expect(mockPhantom.solana.signTransaction).toHaveBeenCalledWith(mockTransaction);
      expect(result).toBeDefined();
    });

    it("should throw error when not connected", async () => {
      walletRegistry.setWalletConnected("phantom", false);

      await expect(solanaChain.signTransaction(mockTransaction)).rejects.toThrow(
        "Provider not connected. Call provider connect first.",
      );
    });
  });

  describe("signAndSendTransaction", () => {
    let mockTransaction: Transaction;

    beforeEach(async () => {
      await solanaChain.connect();
      mockTransaction = {} as Transaction;
    });

    it("should sign and send transaction when connected", async () => {
      const result = await solanaChain.signAndSendTransaction(mockTransaction);

      expect(mockPhantom.solana.signAndSendTransaction).toHaveBeenCalledWith(mockTransaction);
      expect(result.signature).toBeDefined();
    });

    it("should sign and send transaction even when registry shows disconnected", async () => {
      // Note: signAndSendTransaction doesn't check connection state in current implementation
      walletRegistry.setWalletConnected("phantom", false);

      const result = await solanaChain.signAndSendTransaction(mockTransaction);

      expect(mockPhantom.solana.signAndSendTransaction).toHaveBeenCalledWith(mockTransaction);
      expect(result.signature).toBeDefined();
    });
  });

  describe("signAllTransactions", () => {
    let mockTransactions: Transaction[];

    beforeEach(async () => {
      await solanaChain.connect();
      mockTransactions = [{} as Transaction, {} as Transaction];
    });

    it("should sign all transactions when connected", async () => {
      const result = await solanaChain.signAllTransactions(mockTransactions);

      expect(mockPhantom.solana.signAllTransactions).toHaveBeenCalledWith(mockTransactions);
      expect(result.length).toBe(2);
    });

    it("should throw error when not connected", async () => {
      walletRegistry.setWalletConnected("phantom", false);

      await expect(solanaChain.signAllTransactions(mockTransactions)).rejects.toThrow(
        "Provider not connected. Call provider connect first.",
      );
    });
  });

  describe("signAndSendAllTransactions", () => {
    let mockTransactions: Transaction[];

    beforeEach(async () => {
      await solanaChain.connect();
      mockTransactions = [{} as Transaction, {} as Transaction];
    });

    it("should sign and send all transactions when connected", async () => {
      const result = await solanaChain.signAndSendAllTransactions(mockTransactions);

      expect(mockPhantom.solana.signAndSendAllTransactions).toHaveBeenCalledWith(mockTransactions);
      expect(result.signatures.length).toBe(2);
    });

    it("should throw error when not connected", async () => {
      walletRegistry.setWalletConnected("phantom", false);

      await expect(solanaChain.signAndSendAllTransactions(mockTransactions)).rejects.toThrow(
        "Provider not connected. Call provider connect first.",
      );
    });
  });

  describe("switchNetwork", () => {
    it("should resolve without error", async () => {
      await expect(solanaChain.switchNetwork("mainnet")).resolves.toBeUndefined();
      await expect(solanaChain.switchNetwork("devnet")).resolves.toBeUndefined();
    });
  });

  describe("getPublicKey", () => {
    it("should return null when not connected", async () => {
      const result = await solanaChain.getPublicKey();
      expect(result).toBeNull();
    });

    it("should return publicKey when connected", async () => {
      await solanaChain.connect();
      const result = await solanaChain.getPublicKey();
      expect(result).toBe(testPublicKey);
    });
  });

  describe("isConnected", () => {
    it("should return false when not connected", () => {
      expect(solanaChain.isConnected()).toBe(false);
    });

    it("should return true when connected", async () => {
      await solanaChain.connect();
      expect(solanaChain.isConnected()).toBe(true);
    });
  });

  describe("event handling", () => {
    it("should emit connect event when Phantom emits connect", () => {
      const listener = jest.fn();
      solanaChain.on("connect", listener);

      const eventListeners = (mockPhantom.solana as any)._eventListeners;
      const connectListener = eventListeners.get("connect")?.[0];
      connectListener?.(testPublicKey);

      expect(listener).toHaveBeenCalledWith(testPublicKey);
      expect(solanaChain.publicKey).toBe(testPublicKey);
      expect(walletRegistry.isWalletConnected("phantom")).toBe(true);
    });

    it("should emit disconnect event when Phantom emits disconnect", () => {
      const listener = jest.fn();
      solanaChain.on("disconnect", listener);

      const eventListeners = (mockPhantom.solana as any)._eventListeners;
      const disconnectListener = eventListeners.get("disconnect")?.[0];
      disconnectListener?.();

      expect(listener).toHaveBeenCalled();
      expect(solanaChain.publicKey).toBeNull();
      expect(walletRegistry.isWalletConnected("phantom")).toBe(false);
    });

    it("should emit accountChanged event when Phantom emits accountChanged", () => {
      const listener = jest.fn();
      solanaChain.on("accountChanged", listener);

      const newPublicKey = "NewPublicKey123";
      const eventListeners = (mockPhantom.solana as any)._eventListeners;
      const accountChangedListener = eventListeners.get("accountChanged")?.[0];
      accountChangedListener?.(newPublicKey);

      expect(listener).toHaveBeenCalledWith(newPublicKey);
      expect(solanaChain.publicKey).toBe(newPublicKey);
    });

    it("should allow removing event listeners", () => {
      const listener = jest.fn();
      solanaChain.on("connect", listener);
      solanaChain.off("connect", listener);

      const eventListeners = (mockPhantom.solana as any)._eventListeners;
      const connectListener = eventListeners.get("connect")?.[0];
      connectListener?.(testPublicKey);

      expect(listener).not.toHaveBeenCalled();
    });
  });

  describe("syncInitialState", () => {
    it("should sync publicKey from registry addresses", () => {
      walletRegistry.setWalletAddresses("phantom", [
        { addressType: AddressType.solana, address: testPublicKey },
      ]);

      const newChain = new PhantomSolanaChain(mockPhantom, "phantom", walletRegistry);

      expect(newChain.publicKey).toBe(testPublicKey);
    });

    it("should handle missing Solana address in registry", () => {
      walletRegistry.setWalletAddresses("phantom", [
        { addressType: AddressType.ethereum, address: "0x123" },
      ]);

      const newChain = new PhantomSolanaChain(mockPhantom, "phantom", walletRegistry);

      expect(newChain.publicKey).toBeNull();
    });
  });
});

