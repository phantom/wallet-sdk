import type { PhantomSolanaProvider } from "../types";
import { InjectedSolanaStrategy } from "./injected";
import type { Transaction } from "@phantom/sdk-types";

const mockTransaction = {} as Transaction;

const createMockProvider = () => ({
  connect: jest.fn().mockResolvedValue({
    publicKey: {
      toString: () => "123",
      toBase58: () => "123",
    },
  }),
  isConnected: true,
  publicKey: {
    toString: () => "123",
    toBase58: () => "123",
  },
  disconnect: jest.fn(),
  signMessage: jest.fn(),
  signTransaction: jest.fn(),
  signAllTransactions: jest.fn(),
  signAndSendTransaction: jest.fn(),
  signIn: jest.fn(),
});

describe("InjectedSolanaStrategy", () => {
  let mockProvider: Partial<PhantomSolanaProvider>;

  beforeAll(() => {
    mockProvider = createMockProvider();
    (window as any).phantom = {
      solana: mockProvider,
    };
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("connect", () => {
    beforeAll(() => {
      mockProvider = createMockProvider();
      (window as any).phantom = {
        solana: mockProvider,
      };
      mockProvider.isConnected = false;
    });

    it("should properly call connect on the provider with onlyIfTrusted true and when provider is not connected", async () => {
      const strategy = new InjectedSolanaStrategy();
      const result = await strategy.connect({ onlyIfTrusted: true });
      expect(result).toBe("123");
      expect(mockProvider.connect).toHaveBeenCalledWith({ onlyIfTrusted: true });
    });

    it("should properly call connect on the provider with onlyIfTrusted false and when provider is not connected", async () => {
      const strategy = new InjectedSolanaStrategy();
      const result = await strategy.connect({ onlyIfTrusted: false });
      expect(result).toBe("123");
      expect(mockProvider.connect).toHaveBeenCalledWith({ onlyIfTrusted: false });
    });

    it("should not call connect on the provider with onlyIfTrusted true and when provider is connected", async () => {
      const strategy = new InjectedSolanaStrategy();
      mockProvider.isConnected = true;
      const result = await strategy.connect({ onlyIfTrusted: true });
      expect(result).toBeDefined();
      expect(mockProvider.connect).not.toHaveBeenCalled();
    });

    it("should not call connect on the provider with onlyIfTrusted false and when provider is connected", async () => {
      const strategy = new InjectedSolanaStrategy();
      mockProvider.isConnected = true;
      const result = await strategy.connect({ onlyIfTrusted: false });
      expect(result).toBeDefined();
      expect(mockProvider.connect).not.toHaveBeenCalled();
    });

    it("should throw an error if the provider is not connected", async () => {
      (window as any).phantom = undefined;
      const strategy = new InjectedSolanaStrategy();
      await expect(strategy.connect({ onlyIfTrusted: true })).rejects.toThrow("Provider not found.");
    });
  });

  describe("disconnect", () => {
    beforeAll(() => {
      mockProvider = createMockProvider();
      (window as any).phantom = {
        solana: mockProvider,
      };
      mockProvider.isConnected = true;
    });

    it("should properly call disconnect on the provider", async () => {
      const strategy = new InjectedSolanaStrategy();
      await strategy.disconnect();
      expect(mockProvider.disconnect).toHaveBeenCalled();
    });

    it("should throw an error if the provider is not connected", async () => {
      (window as any).phantom = undefined;
      const strategy = new InjectedSolanaStrategy();
      await expect(strategy.disconnect()).rejects.toThrow("Provider not found.");
    });
  });

  describe("isConnected", () => {
    beforeAll(() => {
      mockProvider = createMockProvider();
      (window as any).phantom = {
        solana: mockProvider,
      };
    });

    it("should return true when provider is connected and has public key", () => {
      const strategy = new InjectedSolanaStrategy();
      expect(strategy.isConnected).toBe(true);
    });

    it("should return false when provider is connected but has no public key", () => {
      mockProvider.publicKey = undefined;
      const strategy = new InjectedSolanaStrategy();
      expect(strategy.isConnected).toBe(false);
    });

    it("should return false when provider is not connected", () => {
      mockProvider.isConnected = false;
      const strategy = new InjectedSolanaStrategy();
      expect(strategy.isConnected).toBe(false);
    });

    it("should return false when provider is not found", () => {
      (window as any).phantom = undefined;
      const strategy = new InjectedSolanaStrategy();
      expect(strategy.isConnected).toBe(false);
    });
  });

  describe("getAccount", () => {
    beforeAll(() => {
      mockProvider = createMockProvider();
      (window as any).phantom = {
        solana: mockProvider,
      };
    });

    it("should return the public key when provider is connected and has public key", async () => {
      const strategy = new InjectedSolanaStrategy();
      const result = await strategy.getAccount();
      expect(result).toBe("123");
    });

    it("should return undefined when provider is connected but has no public key", async () => {
      mockProvider.publicKey = undefined;
      const strategy = new InjectedSolanaStrategy();
      const result = await strategy.getAccount();
      expect(result).toBeUndefined();
    });

    it("should return undefined when provider is not connected", async () => {
      mockProvider.isConnected = false;
      const strategy = new InjectedSolanaStrategy();
      const result = await strategy.getAccount();
      expect(result).toBeUndefined();
    });

    it("should return undefined when provider is not found", async () => {
      (window as any).phantom = undefined;
      const strategy = new InjectedSolanaStrategy();
      const result = await strategy.getAccount();
      expect(result).toBeUndefined();
    });
  });

  describe("signMessage", () => {
    beforeAll(() => {
      mockProvider = createMockProvider();
      (window as any).phantom = {
        solana: mockProvider,
      };
      mockProvider.isConnected = true;
      mockProvider.signMessage = jest.fn().mockResolvedValue({
        signature: new Uint8Array([1, 2, 3]),
        publicKey: {
          toString: () => "mockKey",
          toBase58: () => "mockKey",
        },
      });
    });

    it("should properly call signMessage on the provider", async () => {
      const strategy = new InjectedSolanaStrategy();
      const message = new Uint8Array([1, 2, 3]);

      const result = await strategy.signMessage(message);

      expect(result).toEqual({
        signature: new Uint8Array([1, 2, 3]),
        address: "mockKey",
      });
      expect(mockProvider.signMessage).toHaveBeenCalledWith(message, undefined);
    });

    it("should sign message with display encoding when provided", async () => {
      const strategy = new InjectedSolanaStrategy();
      const message = new Uint8Array([1, 2, 3]);
      const result = await strategy.signMessage(message, "utf8");
      expect(result).toEqual({
        signature: new Uint8Array([1, 2, 3]),
        address: "mockKey",
      });
      expect(mockProvider.signMessage).toHaveBeenCalledWith(message, "utf8");
    });

    it("should throw error when provider is not connected", async () => {
      mockProvider.isConnected = false;
      const strategy = new InjectedSolanaStrategy();
      const message = new Uint8Array([1, 2, 3]);
      await expect(strategy.signMessage(message)).rejects.toThrow("Provider is not connected.");
    });

    it("should throw error when provider is not found", async () => {
      (window as any).phantom = undefined;
      const strategy = new InjectedSolanaStrategy();
      const message = new Uint8Array([1, 2, 3]);
      await expect(strategy.signMessage(message)).rejects.toThrow("Provider not found.");
    });
  });

  describe("signIn", () => {
    beforeAll(() => {
      mockProvider = createMockProvider();
      (window as any).phantom = {
        solana: mockProvider,
      };
      mockProvider.signIn = jest.fn().mockResolvedValue({
        address: {
          toString: () => "mockAddress",
        },
        signature: new Uint8Array([4, 5, 6]),
        signedMessage: new Uint8Array([7, 8, 9]),
      });
    });

    it("should properly call signIn on the provider", async () => {
      const strategy = new InjectedSolanaStrategy();
      const signInData = {
        domain: "example.com",
        statement: "Sign in to Example App",
        uri: "https://example.com",
        version: "1",
        chainId: "mainnet-beta",
        nonce: "12345",
        issuedAt: "2023-01-01T00:00:00.000Z",
      };

      const result = await strategy.signIn(signInData);

      expect(result).toEqual({
        address: "mockAddress",
        signature: new Uint8Array([4, 5, 6]),
        signedMessage: new Uint8Array([7, 8, 9]),
      });
      expect(mockProvider.signIn).toHaveBeenCalledWith(signInData);
    });

    it("should throw error when provider is not found", async () => {
      (window as any).phantom = undefined;
      const strategy = new InjectedSolanaStrategy();
      const signInData = {
        domain: "example.com",
        statement: "Sign in to Example App",
        uri: "https://example.com",
        version: "1",
        chainId: "mainnet-beta",
        nonce: "12345",
        issuedAt: "2023-01-01T00:00:00.000Z",
      };
      await expect(strategy.signIn(signInData)).rejects.toThrow("Provider not found.");
    });
  });

  describe("signAndSendTransaction", () => {
    beforeAll(() => {
      mockProvider = createMockProvider();
      (window as any).phantom = {
        solana: mockProvider,
      };
      mockProvider.isConnected = true;
      mockProvider.signAndSendTransaction = jest.fn().mockResolvedValue({
        signature: "mockSignature123",
        publicKey: "mockPublicKey456",
      });
    });

    beforeEach(() => {
      jest.clearAllMocks();
    });

    it("should properly call signAndSendTransaction on the provider", async () => {
      const strategy = new InjectedSolanaStrategy();

      const result = await strategy.signAndSendTransaction(mockTransaction);

      expect(result).toEqual({
        signature: "mockSignature123",
        address: "mockPublicKey456",
      });
      expect(mockProvider.signAndSendTransaction).toHaveBeenCalledWith(mockTransaction);
    });

    it("should throw error when provider is not connected", async () => {
      mockProvider.isConnected = false;
      const strategy = new InjectedSolanaStrategy();
      const mockTransaction = {} as Transaction;

      await expect(strategy.signAndSendTransaction(mockTransaction)).rejects.toThrow("Provider is not connected.");
    });

    it("should throw error when provider is not found", async () => {
      (window as any).phantom = undefined;
      const strategy = new InjectedSolanaStrategy();
      const mockTransaction = {} as Transaction;

      await expect(strategy.signAndSendTransaction(mockTransaction)).rejects.toThrow("Provider not found.");
    });
  });

  describe("signTransaction", () => {
    beforeAll(() => {
      mockProvider = createMockProvider();
      (window as any).phantom = {
        solana: mockProvider,
      };
      mockProvider.isConnected = true;
      mockProvider.signTransaction = jest.fn().mockResolvedValue(mockTransaction);
    });

    beforeEach(() => {
      jest.clearAllMocks();
    });

    it("should properly call signTransaction on the provider", async () => {
      const strategy = new InjectedSolanaStrategy();

      const result = await strategy.signTransaction(mockTransaction);

      expect(mockProvider.signTransaction).toHaveBeenCalledWith(mockTransaction);
      expect(result).toEqual(mockTransaction);
    });

    it("should throw error when provider is not connected", async () => {
      mockProvider.isConnected = false;
      const strategy = new InjectedSolanaStrategy();
      const mockTransaction = {} as Transaction;

      await expect(strategy.signTransaction(mockTransaction)).rejects.toThrow("Provider is not connected.");
    });

    it("should throw error when provider is not found", async () => {
      (window as any).phantom = undefined;
      const strategy = new InjectedSolanaStrategy();
      const mockTransaction = {} as Transaction;

      await expect(strategy.signTransaction(mockTransaction)).rejects.toThrow("Provider not found.");
    });
  });

  describe("signAllTransactions", () => {
    beforeAll(() => {
      mockProvider = createMockProvider();
      (window as any).phantom = {
        solana: mockProvider,
      };
      mockProvider.isConnected = true;
      mockProvider.signAllTransactions = jest.fn().mockResolvedValue([mockTransaction, mockTransaction]);
    });

    beforeEach(() => {
      jest.clearAllMocks();
    });

    it("should properly call signAllTransactions on the provider", async () => {
      const strategy = new InjectedSolanaStrategy();
      const mockTransactions = [{} as Transaction, {} as Transaction];

      const result = await strategy.signAllTransactions(mockTransactions);

      expect(mockProvider.signAllTransactions).toHaveBeenCalledWith(mockTransactions);
      expect(result).toHaveLength(2);
      expect(result).toEqual([mockTransaction, mockTransaction]);
    });

    it("should handle empty array of transactions", async () => {
      mockProvider.signAllTransactions = jest.fn().mockResolvedValue([]);
      const strategy = new InjectedSolanaStrategy();
      const mockTransactions: Transaction[] = [];

      const result = await strategy.signAllTransactions(mockTransactions);

      expect(mockProvider.signAllTransactions).toHaveBeenCalledWith([]);
      expect(result).toEqual([]);
    });

    it("should throw error when provider is not connected", async () => {
      mockProvider.isConnected = false;
      const strategy = new InjectedSolanaStrategy();
      const mockTransactions = [{} as Transaction];

      await expect(strategy.signAllTransactions(mockTransactions)).rejects.toThrow("Provider is not connected.");
    });

    it("should throw error when provider is not found", async () => {
      (window as any).phantom = undefined;
      const strategy = new InjectedSolanaStrategy();
      const mockTransactions = [{} as Transaction];

      await expect(strategy.signAllTransactions(mockTransactions)).rejects.toThrow("Provider not found.");
    });
  });
});
