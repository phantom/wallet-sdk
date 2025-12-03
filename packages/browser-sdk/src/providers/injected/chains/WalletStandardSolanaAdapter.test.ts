import { WalletStandardSolanaAdapter } from "./WalletStandardSolanaAdapter";
import type { Transaction } from "@phantom/sdk-types";

describe("WalletStandardSolanaAdapter", () => {
  let mockWallet: any;
  let adapter: WalletStandardSolanaAdapter;
  const walletId = "test-wallet";
  const walletName = "Test Wallet";
  const testPublicKey = "Exb31jgzHxCJokKdeCkbCNEX6buTZxEFLXCaUWXe4VSM";

  beforeEach(() => {
    // Create mock Wallet Standard wallet
    mockWallet = {
      name: walletName,
      icon: "data:image/svg+xml;base64,...",
      version: "1.0.0",
      chains: ["solana:mainnet"],
      accounts: [
        {
          address: testPublicKey,
          publicKey: new Uint8Array(32).fill(1),
          chains: ["solana:mainnet"],
          features: ["standard:signMessage", "solana:signTransaction"],
        },
      ],
      features: {
        "standard:connect": {
          connect: jest.fn().mockResolvedValue([
            {
              address: testPublicKey,
              publicKey: new Uint8Array(32).fill(1),
              chains: ["solana:mainnet"],
            },
          ]),
        },
        "standard:disconnect": {
          disconnect: jest.fn().mockResolvedValue(undefined),
        },
        "standard:events": {
          on: jest.fn(),
          off: jest.fn(),
        },
        "solana:signMessage": {
          signMessage: jest.fn().mockResolvedValue([
            {
              signedMessage: new Uint8Array([72, 101, 108, 108, 111]),
              signature: new Uint8Array(64).fill(146),
              account: {
                address: testPublicKey,
                publicKey: new Uint8Array(32).fill(1),
              },
            },
          ]),
        },
        "solana:signTransaction": {
          signTransaction: jest.fn().mockResolvedValue([
            {
              signedTransaction: new Uint8Array([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]),
            },
          ]),
        },
        "solana:signAndSendTransaction": {
          signAndSendTransaction: jest.fn().mockResolvedValue([
            {
              signature: new Uint8Array([
                1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24, 25, 26, 27, 28,
                29, 30, 31, 32, 33, 34, 35, 36, 37, 38, 39, 40, 41, 42, 43, 44, 45, 46, 47, 48, 49, 50, 51, 52, 53, 54,
                55, 56, 57, 58, 59, 60, 61, 62, 63, 64,
              ]),
            },
          ]),
        },
        "solana:signIn": {
          signIn: jest.fn(),
        },
      },
    };

    adapter = new WalletStandardSolanaAdapter(mockWallet, walletId, walletName);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe("constructor", () => {
    it("should initialize with wallet, walletId, and walletName", () => {
      expect(adapter).toBeDefined();
      expect((adapter as any).wallet).toBe(mockWallet);
      expect((adapter as any).walletId).toBe(walletId);
      expect((adapter as any).walletName).toBe(walletName);
    });

    it("should initialize with connected=false and publicKey=null", () => {
      expect(adapter.connected).toBe(false);
      expect(adapter.publicKey).toBeNull();
    });
  });

  describe("connect", () => {
    it("should connect using standard:connect feature", async () => {
      const result = await adapter.connect();

      expect(mockWallet.features["standard:connect"].connect).toHaveBeenCalled();
      expect(result.publicKey).toBe(testPublicKey);
      expect(adapter.connected).toBe(true);
      expect(adapter.publicKey).toBe(testPublicKey);
    });

    it("should handle connect with onlyIfTrusted option", async () => {
      await adapter.connect({ onlyIfTrusted: true });

      expect(mockWallet.features["standard:connect"].connect).toHaveBeenCalled();
      expect(adapter.connected).toBe(true);
    });

    it("should use wallet.accounts if connect returns void", async () => {
      mockWallet.features["standard:connect"].connect.mockResolvedValue(undefined);
      mockWallet.accounts = [
        {
          address: testPublicKey,
          publicKey: new Uint8Array(32).fill(1),
        },
      ];

      const result = await adapter.connect();

      expect(result.publicKey).toBe(testPublicKey);
      expect(adapter.connected).toBe(true);
    });

    it("should throw error if connect feature is not available", async () => {
      delete mockWallet.features["standard:connect"];

      await expect(adapter.connect()).rejects.toThrow("Wallet Standard connect feature not available");
    });

    it("should throw error if no accounts are returned", async () => {
      mockWallet.features["standard:connect"].connect.mockResolvedValue([]);
      mockWallet.accounts = []; // Clear accounts to ensure fallback also fails

      await expect(adapter.connect()).rejects.toThrow("No accounts available after connecting to wallet");
    });

    it("should handle account as string", async () => {
      mockWallet.features["standard:connect"].connect.mockResolvedValue([testPublicKey]);

      const result = await adapter.connect();

      expect(result.publicKey).toBe(testPublicKey);
    });

    it("should extract address from account object", async () => {
      mockWallet.features["standard:connect"].connect.mockResolvedValue([
        {
          address: testPublicKey,
          publicKey: new Uint8Array(32).fill(1),
        },
      ]);

      const result = await adapter.connect();

      expect(result.publicKey).toBe(testPublicKey);
    });

    it("should extract address from account.publicKey", async () => {
      const publicKeyBytes = new Uint8Array(32).fill(1);
      mockWallet.features["standard:connect"].connect.mockResolvedValue([
        {
          publicKey: publicKeyBytes,
        },
      ]);

      const result = await adapter.connect();

      expect(result.publicKey).toBeDefined();
    });
  });

  describe("disconnect", () => {
    beforeEach(async () => {
      await adapter.connect();
    });

    it("should disconnect using standard:disconnect feature", async () => {
      await adapter.disconnect();

      expect(mockWallet.features["standard:disconnect"].disconnect).toHaveBeenCalled();
      expect(adapter.connected).toBe(false);
      expect(adapter.publicKey).toBeNull();
    });

    it("should handle disconnect when feature is not available", async () => {
      delete mockWallet.features["standard:disconnect"];

      await adapter.disconnect();

      expect(adapter.connected).toBe(false);
      expect(adapter.publicKey).toBeNull();
    });
  });

  describe("signMessage", () => {
    beforeEach(async () => {
      await adapter.connect();
    });

    it("should sign message using solana:signMessage feature", async () => {
      const message = "Hello from Phantom SDK!";
      const result = await adapter.signMessage(message);

      expect(mockWallet.features["solana:signMessage"].signMessage).toHaveBeenCalledWith({
        message: new TextEncoder().encode(message),
        account: mockWallet.accounts[0],
      });
      expect(result.signature).toBeInstanceOf(Uint8Array);
      expect(result.signature.length).toBe(64);
      expect(result.publicKey).toBe(testPublicKey);
    });

    it("should handle Uint8Array message", async () => {
      const messageBytes = new Uint8Array([72, 101, 108, 108, 111]);
      const result = await adapter.signMessage(messageBytes);

      expect(mockWallet.features["solana:signMessage"].signMessage).toHaveBeenCalledWith({
        message: messageBytes,
        account: mockWallet.accounts[0],
      });
      expect(result.signature).toBeInstanceOf(Uint8Array);
    });

    it("should handle signature as Uint8Array", async () => {
      const signature = new Uint8Array(64).fill(146);
      mockWallet.features["solana:signMessage"].signMessage.mockResolvedValue([
        {
          signedMessage: new Uint8Array([72, 101, 108, 108, 111]),
          signature,
          account: { address: testPublicKey },
        },
      ]);

      const result = await adapter.signMessage("Hello");

      expect(result.signature).toBe(signature);
      expect(result.signature.length).toBe(64);
    });

    it("should handle signature as array", async () => {
      const signatureArray = Array.from(new Uint8Array(64).fill(146));
      mockWallet.features["solana:signMessage"].signMessage.mockResolvedValue([
        {
          signedMessage: new Uint8Array([72, 101, 108, 108, 111]),
          signature: signatureArray,
          account: { address: testPublicKey },
        },
      ]);

      const result = await adapter.signMessage("Hello");

      expect(result.signature).toBeInstanceOf(Uint8Array);
      expect(result.signature.length).toBe(64);
    });

    it("should handle signature as object with numeric keys (serialized)", async () => {
      // Simulate JSON-serialized Uint8Array
      const signatureObj: any = {};
      for (let i = 0; i < 64; i++) {
        signatureObj[i] = 146;
      }
      mockWallet.features["solana:signMessage"].signMessage.mockResolvedValue([
        {
          signedMessage: new Uint8Array([72, 101, 108, 108, 111]),
          signature: signatureObj,
          account: { address: testPublicKey },
        },
      ]);

      const result = await adapter.signMessage("Hello");

      expect(result.signature).toBeInstanceOf(Uint8Array);
      expect(result.signature.length).toBe(64);
      expect(result.signature[0]).toBe(146);
      expect(result.signature[63]).toBe(146);
    });

    it("should throw error if signMessage feature is not available", async () => {
      delete mockWallet.features["solana:signMessage"];

      await expect(adapter.signMessage("Hello")).rejects.toThrow("Wallet Standard signMessage feature not available");
    });

    it("should throw error if result is not an array", async () => {
      mockWallet.features["solana:signMessage"].signMessage.mockResolvedValue({});

      await expect(adapter.signMessage("Hello")).rejects.toThrow("Expected array result from signMessage");
    });

    it("should throw error if signature is missing", async () => {
      mockWallet.features["solana:signMessage"].signMessage.mockResolvedValue([
        {
          signedMessage: new Uint8Array([72, 101, 108, 108, 111]),
        },
      ]);

      await expect(adapter.signMessage("Hello")).rejects.toThrow("Invalid signMessage result structure");
    });

    it("should use account address from result if available", async () => {
      const differentAddress = "DifferentAddress123";
      mockWallet.features["solana:signMessage"].signMessage.mockResolvedValue([
        {
          signedMessage: new Uint8Array([72, 101, 108, 108, 111]),
          signature: new Uint8Array(64).fill(146),
          account: { address: differentAddress },
        },
      ]);

      const result = await adapter.signMessage("Hello");

      expect(result.publicKey).toBe(differentAddress);
    });
  });

  describe("signTransaction", () => {
    let mockTransaction: Transaction;

    beforeEach(async () => {
      await adapter.connect();
      // Create a mock transaction with serialize method
      mockTransaction = {
        serialize: jest.fn().mockReturnValue(new Uint8Array([1, 2, 3, 4, 5])),
      } as unknown as Transaction;
    });

    it("should sign transaction using solana:signTransaction feature", async () => {
      const result = await adapter.signTransaction(mockTransaction);

      expect(mockWallet.features["solana:signTransaction"].signTransaction).toHaveBeenCalledWith({
        transaction: expect.any(Uint8Array),
        account: mockWallet.accounts[0],
      });
      expect(result).toBeDefined();
      expect(result).toBeInstanceOf(Object);
    });

    it("should throw error if signTransaction feature is not available", async () => {
      delete mockWallet.features["solana:signTransaction"];

      await expect(adapter.signTransaction(mockTransaction)).rejects.toThrow(
        "Wallet Standard signTransaction feature not available",
      );
    });
  });

  describe("signAndSendTransaction", () => {
    let mockTransaction: Transaction;

    beforeEach(async () => {
      await adapter.connect();
      mockTransaction = {} as unknown as Transaction;
    });

    it("should sign and send transaction using solana:signAndSendTransaction feature", async () => {
      const result = await adapter.signAndSendTransaction(mockTransaction);

      expect(mockWallet.features["solana:signAndSendTransaction"].signAndSendTransaction).toHaveBeenCalledWith({
        transaction: expect.any(Uint8Array),
        account: mockWallet.accounts[0],
        chain: "solana:mainnet",
      });
      expect(result.signature).toBeDefined();
      expect(typeof result.signature).toBe("string");
    });

    it("should handle signature as Uint8Array and convert to string", async () => {
      const signatureBytes = new Uint8Array([1, 2, 3, 4, 5]);
      mockWallet.features["solana:signAndSendTransaction"].signAndSendTransaction.mockResolvedValue([
        {
          signature: signatureBytes,
        },
      ]);

      const result = await adapter.signAndSendTransaction(mockTransaction);

      expect(result.signature).toBeDefined();
      expect(typeof result.signature).toBe("string");
    });

    it("should handle single object result format (fallback)", async () => {
      const signatureBytes = new Uint8Array([1, 2, 3, 4, 5]);
      mockWallet.features["solana:signAndSendTransaction"].signAndSendTransaction.mockResolvedValue({
        signature: signatureBytes,
      });

      const result = await adapter.signAndSendTransaction(mockTransaction);

      expect(result.signature).toBeDefined();
      expect(typeof result.signature).toBe("string");
    });

    it("should throw error if signAndSendTransaction feature is not available", async () => {
      delete mockWallet.features["solana:signAndSendTransaction"];

      await expect(adapter.signAndSendTransaction(mockTransaction)).rejects.toThrow(
        "Wallet Standard signAndSendTransaction feature not available",
      );
    });
  });

  describe("signAllTransactions", () => {
    let mockTransactions: Transaction[];

    beforeEach(async () => {
      await adapter.connect();
      mockTransactions = [{} as unknown as Transaction, {} as unknown as Transaction];
    });

    it("should sign all transactions using solana:signTransaction feature", async () => {
      const result = await adapter.signAllTransactions(mockTransactions);

      expect(mockWallet.features["solana:signTransaction"].signTransaction).toHaveBeenCalledTimes(2);
      expect(result.length).toBe(2);
    });

    it("should throw error if signTransaction feature is not available", async () => {
      delete mockWallet.features["solana:signTransaction"];

      await expect(adapter.signAllTransactions(mockTransactions)).rejects.toThrow(
        "Wallet Standard signTransaction feature not available",
      );
    });
  });

  describe("signAndSendAllTransactions", () => {
    let mockTransactions: Transaction[];

    beforeEach(async () => {
      await adapter.connect();
      mockTransactions = [{} as unknown as Transaction, {} as unknown as Transaction];
    });

    it("should sign and send all transactions", async () => {
      const result = await adapter.signAndSendAllTransactions(mockTransactions);

      expect(mockWallet.features["solana:signAndSendTransaction"].signAndSendTransaction).toHaveBeenCalledTimes(2);
      expect(result.signatures.length).toBe(2);
    });

    it("should throw error if signAndSendTransaction feature is not available", async () => {
      delete mockWallet.features["solana:signAndSendTransaction"];

      await expect(adapter.signAndSendAllTransactions(mockTransactions)).rejects.toThrow(
        "Wallet Standard signAndSendTransaction feature not available",
      );
    });
  });

  describe("switchNetwork", () => {
    it("should resolve without error", async () => {
      await expect(adapter.switchNetwork("mainnet")).resolves.toBeUndefined();
      await expect(adapter.switchNetwork("devnet")).resolves.toBeUndefined();
    });
  });

  describe("getPublicKey", () => {
    it("should return null when not connected", async () => {
      const result = await adapter.getPublicKey();
      expect(result).toBeNull();
    });

    it("should return publicKey when connected", async () => {
      await adapter.connect();
      const result = await adapter.getPublicKey();
      expect(result).toBe(testPublicKey);
    });
  });

  describe("isConnected", () => {
    it("should return false when not connected", () => {
      expect(adapter.isConnected()).toBe(false);
    });

    it("should return true when connected", async () => {
      await adapter.connect();
      expect(adapter.isConnected()).toBe(true);
    });
  });

  describe("event handling", () => {
    it("should delegate on() to standard:events feature", () => {
      const listener = jest.fn();
      adapter.on("connect", listener);

      expect(mockWallet.features["standard:events"].on).toHaveBeenCalledWith("connect", listener);
    });

    it("should delegate off() to standard:events feature", () => {
      const listener = jest.fn();
      adapter.off("connect", listener);

      expect(mockWallet.features["standard:events"].off).toHaveBeenCalledWith("connect", listener);
    });

    it("should handle missing events feature gracefully", () => {
      delete mockWallet.features["standard:events"];

      expect(() => adapter.on("connect", jest.fn())).not.toThrow();
      expect(() => adapter.off("connect", jest.fn())).not.toThrow();
    });
  });
});
