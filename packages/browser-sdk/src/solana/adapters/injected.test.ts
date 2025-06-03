import type { PhantomSolanaProvider, VersionedTransaction } from "../types";
import { InjectedSolanaAdapter } from "./injected";
import { transactionToVersionedTransaction } from "../utils/transactionToVersionedTransaction";
import type { Transaction } from "@solana/transactions";
import { fromVersionedTransaction } from "@solana/compat";

jest.mock("../utils/transactionToVersionedTransaction", () => ({
  transactionToVersionedTransaction: jest.fn(),
}));

jest.mock("@solana/compat", () => ({
  fromVersionedTransaction: jest.fn(),
}));

const mockTransaction = {} as Transaction;
const mockVersionedTransaction = {
  signatures: [new Uint8Array([1, 2, 3])],
  message: {
    deserialize: jest.fn(),
    serialize: jest.fn(),
  },
} as VersionedTransaction;

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

describe("InjectedSolanaAdapter", () => {
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
      const adapter = new InjectedSolanaAdapter();
      const result = await adapter.connect({ onlyIfTrusted: true });
      expect(result).toBe("123");
      expect(mockProvider.connect).toHaveBeenCalledWith({ onlyIfTrusted: true });
    });

    it("should properly call connect on the provider with onlyIfTrusted false and when provider is not connected", async () => {
      const adapter = new InjectedSolanaAdapter();
      const result = await adapter.connect({ onlyIfTrusted: false });
      expect(result).toBe("123");
      expect(mockProvider.connect).toHaveBeenCalledWith({ onlyIfTrusted: false });
    });

    it("should not call connect on the provider with onlyIfTrusted true and when provider is connected", async () => {
      const adapter = new InjectedSolanaAdapter();
      mockProvider.isConnected = true;
      const result = await adapter.connect({ onlyIfTrusted: true });
      expect(result).toBeDefined();
      expect(mockProvider.connect).not.toHaveBeenCalled();
    });

    it("should not call connect on the provider with onlyIfTrusted false and when provider is connected", async () => {
      const adapter = new InjectedSolanaAdapter();
      mockProvider.isConnected = true;
      const result = await adapter.connect({ onlyIfTrusted: false });
      expect(result).toBeDefined();
      expect(mockProvider.connect).not.toHaveBeenCalled();
    });

    it("should throw an error if the provider is not connected", async () => {
      (window as any).phantom = undefined;
      const adapter = new InjectedSolanaAdapter();
      await expect(adapter.connect({ onlyIfTrusted: true })).rejects.toThrow("Phantom provider not found.");
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
      const adapter = new InjectedSolanaAdapter();
      await adapter.disconnect();
      expect(mockProvider.disconnect).toHaveBeenCalled();
    });

    it("should throw an error if the provider is not connected", async () => {
      (window as any).phantom = undefined;
      const adapter = new InjectedSolanaAdapter();
      await expect(adapter.disconnect()).rejects.toThrow("Phantom provider not found.");
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
      const adapter = new InjectedSolanaAdapter();
      expect(adapter.isConnected).toBe(true);
    });

    it("should return false when provider is connected but has no public key", () => {
      mockProvider.publicKey = undefined;
      const adapter = new InjectedSolanaAdapter();
      expect(adapter.isConnected).toBe(false);
    });

    it("should return false when provider is not connected", () => {
      mockProvider.isConnected = false;
      const adapter = new InjectedSolanaAdapter();
      expect(adapter.isConnected).toBe(false);
    });

    it("should return false when provider is not found", () => {
      (window as any).phantom = undefined;
      const adapter = new InjectedSolanaAdapter();
      expect(adapter.isConnected).toBe(false);
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
      const adapter = new InjectedSolanaAdapter();
      const result = await adapter.getAccount();
      expect(result).toBe("123");
    });

    it("should return undefined when provider is connected but has no public key", async () => {
      mockProvider.publicKey = undefined;
      const adapter = new InjectedSolanaAdapter();
      const result = await adapter.getAccount();
      expect(result).toBeUndefined();
    });

    it("should return undefined when provider is not connected", async () => {
      mockProvider.isConnected = false;
      const adapter = new InjectedSolanaAdapter();
      const result = await adapter.getAccount();
      expect(result).toBeUndefined();
    });

    it("should return undefined when provider is not found", async () => {
      (window as any).phantom = undefined;
      const adapter = new InjectedSolanaAdapter();
      const result = await adapter.getAccount();
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
      const adapter = new InjectedSolanaAdapter();
      const message = new Uint8Array([1, 2, 3]);

      const result = await adapter.signMessage(message);

      expect(result).toEqual({
        signature: new Uint8Array([1, 2, 3]),
        address: "mockKey",
      });
      expect(mockProvider.signMessage).toHaveBeenCalledWith(message, undefined);
    });

    it("should sign message with display encoding when provided", async () => {
      const adapter = new InjectedSolanaAdapter();
      const message = new Uint8Array([1, 2, 3]);
      const result = await adapter.signMessage(message, "utf8");
      expect(result).toEqual({
        signature: new Uint8Array([1, 2, 3]),
        address: "mockKey",
      });
      expect(mockProvider.signMessage).toHaveBeenCalledWith(message, "utf8");
    });

    it("should throw error when provider is not connected", async () => {
      mockProvider.isConnected = false;
      const adapter = new InjectedSolanaAdapter();
      const message = new Uint8Array([1, 2, 3]);
      await expect(adapter.signMessage(message)).rejects.toThrow("Provider is not connected.");
    });

    it("should throw error when provider is not found", async () => {
      (window as any).phantom = undefined;
      const adapter = new InjectedSolanaAdapter();
      const message = new Uint8Array([1, 2, 3]);
      await expect(adapter.signMessage(message)).rejects.toThrow("Phantom provider not found.");
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
      const adapter = new InjectedSolanaAdapter();
      const signInData = {
        domain: "example.com",
        statement: "Sign in to Example App",
        uri: "https://example.com",
        version: "1",
        chainId: "mainnet-beta",
        nonce: "12345",
        issuedAt: "2023-01-01T00:00:00.000Z",
      };

      const result = await adapter.signIn(signInData);

      expect(result).toEqual({
        address: "mockAddress",
        signature: new Uint8Array([4, 5, 6]),
        signedMessage: new Uint8Array([7, 8, 9]),
      });
      expect(mockProvider.signIn).toHaveBeenCalledWith(signInData);
    });

    it("should throw error when provider is not found", async () => {
      (window as any).phantom = undefined;
      const adapter = new InjectedSolanaAdapter();
      const signInData = {
        domain: "example.com",
        statement: "Sign in to Example App",
        uri: "https://example.com",
        version: "1",
        chainId: "mainnet-beta",
        nonce: "12345",
        issuedAt: "2023-01-01T00:00:00.000Z",
      };
      await expect(adapter.signIn(signInData)).rejects.toThrow("Phantom provider not found.");
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
      (transactionToVersionedTransaction as jest.Mock).mockReturnValue(mockVersionedTransaction);
    });

    beforeEach(() => {
      jest.clearAllMocks();
    });

    it("should properly call signAndSendTransaction on the provider with converted transaction", async () => {
      const adapter = new InjectedSolanaAdapter();

      const result = await adapter.signAndSendTransaction(mockTransaction);

      expect(result).toEqual({
        signature: "mockSignature123",
        address: "mockPublicKey456",
      });
      expect(transactionToVersionedTransaction).toHaveBeenCalledWith(mockTransaction);
      expect(mockProvider.signAndSendTransaction).toHaveBeenCalledWith(mockVersionedTransaction);
    });

    it("should throw error when provider is not connected", async () => {
      mockProvider.isConnected = false;
      const adapter = new InjectedSolanaAdapter();
      const mockTransaction = {} as Transaction;

      await expect(adapter.signAndSendTransaction(mockTransaction)).rejects.toThrow("Provider is not connected.");
    });

    it("should throw error when provider is not found", async () => {
      (window as any).phantom = undefined;
      const adapter = new InjectedSolanaAdapter();
      const mockTransaction = {} as Transaction;

      await expect(adapter.signAndSendTransaction(mockTransaction)).rejects.toThrow("Phantom provider not found.");
    });
  });

  describe("signTransaction", () => {
    beforeAll(() => {
      mockProvider = createMockProvider();
      (window as any).phantom = {
        solana: mockProvider,
      };
      mockProvider.isConnected = true;
      mockProvider.signTransaction = jest.fn().mockResolvedValue(mockVersionedTransaction);
      (transactionToVersionedTransaction as jest.Mock).mockReturnValue(mockVersionedTransaction);
      (fromVersionedTransaction as jest.Mock).mockReturnValue(mockTransaction);
    });

    beforeEach(() => {
      jest.clearAllMocks();
    });

    it("should properly call signTransaction on the provider with converted transaction", async () => {
      const adapter = new InjectedSolanaAdapter();

      const result = await adapter.signTransaction(mockTransaction);

      expect(transactionToVersionedTransaction).toHaveBeenCalledWith(mockTransaction);
      expect(mockProvider.signTransaction).toHaveBeenCalledWith(mockVersionedTransaction);
      expect(result).toEqual(mockTransaction);
    });

    it("should throw error when provider is not connected", async () => {
      mockProvider.isConnected = false;
      const adapter = new InjectedSolanaAdapter();
      const mockTransaction = {} as Transaction;

      await expect(adapter.signTransaction(mockTransaction)).rejects.toThrow("Provider is not connected.");
    });

    it("should throw error when provider is not found", async () => {
      (window as any).phantom = undefined;
      const adapter = new InjectedSolanaAdapter();
      const mockTransaction = {} as Transaction;

      await expect(adapter.signTransaction(mockTransaction)).rejects.toThrow("Phantom provider not found.");
    });
  });

  describe("signAllTransactions", () => {
    beforeAll(() => {
      mockProvider = createMockProvider();
      (window as any).phantom = {
        solana: mockProvider,
      };
      mockProvider.isConnected = true;
      mockProvider.signAllTransactions = jest
        .fn()
        .mockResolvedValue([mockVersionedTransaction, mockVersionedTransaction]);
      (transactionToVersionedTransaction as jest.Mock).mockReturnValue(mockVersionedTransaction);
      (fromVersionedTransaction as jest.Mock).mockReturnValue(mockTransaction);
    });

    beforeEach(() => {
      jest.clearAllMocks();
    });

    it("should properly call signAllTransactions on the provider with converted transactions", async () => {
      const adapter = new InjectedSolanaAdapter();
      const mockTransactions = [{} as Transaction, {} as Transaction];

      const result = await adapter.signAllTransactions(mockTransactions);

      expect(transactionToVersionedTransaction).toHaveBeenCalledTimes(2);
      expect(transactionToVersionedTransaction).toHaveBeenNthCalledWith(1, mockTransactions[0]);
      expect(transactionToVersionedTransaction).toHaveBeenNthCalledWith(2, mockTransactions[1]);
      expect(mockProvider.signAllTransactions).toHaveBeenCalledWith([
        mockVersionedTransaction,
        mockVersionedTransaction,
      ]);
      expect(result).toHaveLength(2);
      expect(result).toEqual([mockTransaction, mockTransaction]);
    });

    it("should handle empty array of transactions", async () => {
      mockProvider.signAllTransactions = jest.fn().mockResolvedValue([]);
      const adapter = new InjectedSolanaAdapter();
      const mockTransactions: Transaction[] = [];

      const result = await adapter.signAllTransactions(mockTransactions);

      expect(transactionToVersionedTransaction).not.toHaveBeenCalled();
      expect(mockProvider.signAllTransactions).toHaveBeenCalledWith([]);
      expect(result).toEqual([]);
    });

    it("should throw error when provider is not connected", async () => {
      mockProvider.isConnected = false;
      const adapter = new InjectedSolanaAdapter();
      const mockTransactions = [{} as Transaction];

      await expect(adapter.signAllTransactions(mockTransactions)).rejects.toThrow("Provider is not connected.");
    });

    it("should throw error when provider is not found", async () => {
      (window as any).phantom = undefined;
      const adapter = new InjectedSolanaAdapter();
      const mockTransactions = [{} as Transaction];

      await expect(adapter.signAllTransactions(mockTransactions)).rejects.toThrow("Phantom provider not found.");
    });
  });
});
