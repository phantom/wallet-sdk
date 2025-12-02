import { PhantomSolanaChain } from "./SolanaChain";
import type { Transaction } from "@phantom/sdk-types";

describe("PhantomSolanaChain", () => {
  let mockPhantom: any;
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

    solanaChain = new PhantomSolanaChain(mockPhantom);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe("constructor", () => {
    it("should initialize with phantom", () => {
      expect(solanaChain).toBeDefined();
      expect((solanaChain as any).phantom).toBe(mockPhantom);
    });

    it("should set up event listeners", () => {
      expect(mockPhantom.solana.addEventListener).toHaveBeenCalled();
    });

    it("should have initial disconnected state", () => {
      expect(solanaChain.connected).toBe(false);
    });
  });

  describe("connected property", () => {
    it("should return false when not connected", () => {
      expect(solanaChain.connected).toBe(false);
    });

    it("should return true when connected", async () => {
      await solanaChain.connect();
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
    it("should connect to Phantom and update internal state", async () => {
      const result = await solanaChain.connect();

      expect(mockPhantom.solana.connect).toHaveBeenCalled();
      expect(result.publicKey).toBe(testPublicKey);
      expect(solanaChain.publicKey).toBe(testPublicKey);
      expect(solanaChain.connected).toBe(true);
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

    it("should handle string result from connect", async () => {
      mockPhantom.solana.connect.mockResolvedValue(testPublicKey);

      const result = await solanaChain.connect();

      expect(result.publicKey).toBe(testPublicKey);
    });

    it("should throw error if connect fails", async () => {
      mockPhantom.solana.connect.mockResolvedValue(null);

      await expect(solanaChain.connect()).rejects.toThrow("Failed to connect to Solana wallet");
    });

    it("should update publicKey when connecting", async () => {
      (solanaChain as any)._publicKey = "old-address";

      await solanaChain.connect();

      expect(solanaChain.publicKey).toBe(testPublicKey);
    });
  });

  describe("disconnect", () => {
    beforeEach(async () => {
      await solanaChain.connect();
    });

    it("should disconnect from Phantom and clear internal state", async () => {
      await solanaChain.disconnect();

      expect(mockPhantom.solana.disconnect).toHaveBeenCalled();
      expect(solanaChain.publicKey).toBeNull();
      expect(solanaChain.connected).toBe(false);
    });
  });

  describe("signMessage", () => {
    beforeEach(async () => {
      await solanaChain.connect();
    });

    it("should sign message using Phantom solana provider", async () => {
      const message = "Hello from Phantom SDK!";
      const result = await solanaChain.signMessage(message);

      expect(mockPhantom.solana.signMessage).toHaveBeenCalledWith(new TextEncoder().encode(message));
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
      (solanaChain as any)._publicKey = null;

      await expect(solanaChain.signTransaction(mockTransaction)).rejects.toThrow(
        "Provider not connected. Call provider connect first.",
      );
    });
  });

  describe("signAndSendTransaction", () => {
    let mockTransaction: Transaction;

    beforeEach(async () => {
      await solanaChain.connect();
      mockTransaction = {} as unknown as Transaction;
    });

    it("should sign and send transaction when connected", async () => {
      const result = await solanaChain.signAndSendTransaction(mockTransaction);

      expect(mockPhantom.solana.signAndSendTransaction).toHaveBeenCalledWith(mockTransaction);
      expect(result.signature).toBeDefined();
    });

    it("should sign and send transaction when connected", async () => {
      const result = await solanaChain.signAndSendTransaction(mockTransaction);

      expect(mockPhantom.solana.signAndSendTransaction).toHaveBeenCalledWith(mockTransaction);
      expect(result.signature).toBeDefined();
    });
  });

  describe("signAllTransactions", () => {
    let mockTransactions: Transaction[];

    beforeEach(async () => {
      await solanaChain.connect();
      mockTransactions = [{} as unknown as Transaction, {} as unknown as Transaction];
    });

    it("should sign all transactions when connected", async () => {
      const result = await solanaChain.signAllTransactions(mockTransactions);

      expect(mockPhantom.solana.signAllTransactions).toHaveBeenCalledWith(mockTransactions);
      expect(result.length).toBe(2);
    });

    it("should throw error when not connected", async () => {
      (solanaChain as any)._publicKey = null;

      await expect(solanaChain.signAllTransactions(mockTransactions)).rejects.toThrow(
        "Provider not connected. Call provider connect first.",
      );
    });
  });

  describe("signAndSendAllTransactions", () => {
    let mockTransactions: Transaction[];

    beforeEach(async () => {
      await solanaChain.connect();
      mockTransactions = [{} as unknown as Transaction, {} as unknown as Transaction];
    });

    it("should sign and send all transactions when connected", async () => {
      const result = await solanaChain.signAndSendAllTransactions(mockTransactions);

      expect(mockPhantom.solana.signAndSendAllTransactions).toHaveBeenCalledWith(mockTransactions);
      expect(result.signatures.length).toBe(2);
    });

    it("should throw error when not connected", async () => {
      (solanaChain as any)._publicKey = null;

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

      // Trigger the event listener that was set up in setupEventListeners
      const eventListeners = (mockPhantom.solana as any)._eventListeners;
      const connectListeners = eventListeners.get("connect") || [];

      // The setupEventListeners should have registered a listener
      // We need to call it directly to simulate Phantom's event
      // Call all connect listeners with the public key
      connectListeners.forEach((listener: (publicKey: string) => void) => listener(testPublicKey));

      expect(listener).toHaveBeenCalledWith(testPublicKey);
      expect(solanaChain.publicKey).toBe(testPublicKey);
      expect(solanaChain.connected).toBe(true);
    });

    it("should emit disconnect event when Phantom emits disconnect", () => {
      // First connect to set up state
      (solanaChain as any)._publicKey = testPublicKey;

      const listener = jest.fn();
      solanaChain.on("disconnect", listener);

      const eventListeners = (mockPhantom.solana as any)._eventListeners;
      const disconnectListeners = eventListeners.get("disconnect") || [];

      // Call all disconnect listeners
      disconnectListeners.forEach((listener: () => void) => listener());

      expect(listener).toHaveBeenCalled();
      expect(solanaChain.publicKey).toBeNull();
      expect(solanaChain.connected).toBe(false);
    });

    it("should emit accountChanged event when Phantom emits accountChanged", () => {
      const listener = jest.fn();
      solanaChain.on("accountChanged", listener);

      const newPublicKey = "NewPublicKey123";
      const eventListeners = (mockPhantom.solana as any)._eventListeners;
      const accountChangedListeners = eventListeners.get("accountChanged") || [];

      // Call all accountChanged listeners with the new public key
      accountChangedListeners.forEach((listener: (publicKey: string) => void) => listener(newPublicKey));

      expect(listener).toHaveBeenCalledWith(newPublicKey);
      expect(solanaChain.publicKey).toBe(newPublicKey);
    });

    it("should allow removing event listeners", () => {
      const listener = jest.fn();
      solanaChain.on("connect", listener);
      solanaChain.off("connect", listener);

      const eventListeners = (mockPhantom.solana as any)._eventListeners;
      const connectListeners = eventListeners.get("connect") || [];

      if (connectListeners.length > 0) {
        connectListeners[0](testPublicKey);
      }

      expect(listener).not.toHaveBeenCalled();
    });
  });
});
