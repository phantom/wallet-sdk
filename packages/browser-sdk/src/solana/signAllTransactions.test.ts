import { signAllTransactions } from "./signAllTransactions";
import { getProvider as defaultGetProvider } from "./getProvider";
import type { PhantomSolanaProvider } from "./types";
import type { Transaction } from "@solana/kit";
import type { VersionedTransaction } from "@solana/web3.js";
import { connect } from "./connect";

jest.mock("./getProvider", () => ({
  getProvider: jest.fn(),
}));
jest.mock("./connect", () => ({
  connect: jest.fn(),
}));

const mockDefaultGetProvider = defaultGetProvider as jest.MockedFunction<() => PhantomSolanaProvider | null>;
const mockConnect = connect as jest.MockedFunction<typeof connect>;

const mockTransactionA = {} as Transaction;
const mockTransactionB = {} as Transaction;
const mockVersionedTransactionA = {} as VersionedTransaction;
const mockVersionedTransactionB = {} as VersionedTransaction;

jest.mock("./utils/transactionToVersionedTransaction", () => ({
  transactionToVersionedTransaction: jest.fn(),
}));
jest.mock("@solana/compat", () => ({
  fromVersionedTransaction: jest.fn(),
}));

import { transactionToVersionedTransaction } from "./utils/transactionToVersionedTransaction";
import { fromVersionedTransaction } from "@solana/compat";

describe("signAllTransactions", () => {
  let mockProvider: Partial<PhantomSolanaProvider>;

  beforeEach(() => {
    mockDefaultGetProvider.mockReset();
    mockConnect.mockReset();
    (transactionToVersionedTransaction as jest.Mock).mockReset();
    (fromVersionedTransaction as jest.Mock).mockReset();
    mockProvider = {
      signAllTransactions: jest.fn(),
      isConnected: true,
    };
    mockDefaultGetProvider.mockReturnValue(mockProvider as PhantomSolanaProvider);
  });

  it("should call provider.signAllTransactions", async () => {
    const transactions = [mockTransactionA, mockTransactionB];
    const versionedTransactions = [mockVersionedTransactionA, mockVersionedTransactionB];

    (transactionToVersionedTransaction as jest.Mock)
      .mockReturnValueOnce(mockVersionedTransactionA)
      .mockReturnValueOnce(mockVersionedTransactionB);

    (mockProvider.signAllTransactions as jest.Mock).mockResolvedValue(versionedTransactions);

    (fromVersionedTransaction as jest.Mock).mockReturnValueOnce(mockTransactionA).mockReturnValueOnce(mockTransactionB);

    const result = await signAllTransactions(transactions);

    expect(transactionToVersionedTransaction).toHaveBeenCalledTimes(2);
    expect(transactionToVersionedTransaction).toHaveBeenNthCalledWith(1, mockTransactionA);
    expect(transactionToVersionedTransaction).toHaveBeenNthCalledWith(2, mockTransactionB);

    expect(mockProvider.signAllTransactions).toHaveBeenCalledWith(versionedTransactions);

    expect(fromVersionedTransaction).toHaveBeenCalledTimes(2);
    expect(result).toEqual(transactions);
  });

  it("should throw an error if provider is not found", async () => {
    mockDefaultGetProvider.mockReturnValue(null);
    await expect(signAllTransactions([mockTransactionA])).rejects.toThrow("Phantom provider not found.");
  });

  it("should throw an error if provider does not support signAllTransactions", async () => {
    mockDefaultGetProvider.mockReturnValue({ isConnected: true } as PhantomSolanaProvider);
    await expect(signAllTransactions([mockTransactionA])).rejects.toThrow(
      "The connected provider does not support signAllTransactions.",
    );
  });

  it("should call connect if provider is not initially connected, then proceed with signAllTransactions", async () => {
    const transactions = [mockTransactionA];
    const versionedTransactions = [mockVersionedTransactionA];
    mockProvider.isConnected = false;

    mockConnect.mockImplementation(async () => {
      const providerFromGetProvider = defaultGetProvider() as PhantomSolanaProvider | null;
      if (providerFromGetProvider) {
        providerFromGetProvider.isConnected = true;
      }
      return Promise.resolve("mockPublicKeyString");
    });

    (transactionToVersionedTransaction as jest.Mock).mockReturnValue(mockVersionedTransactionA);
    (mockProvider.signAllTransactions as jest.Mock).mockResolvedValue(versionedTransactions);

    (fromVersionedTransaction as jest.Mock).mockReturnValue(mockTransactionA);

    const result = await signAllTransactions(transactions);

    expect(mockDefaultGetProvider).toHaveBeenCalledTimes(2); // Once in the main function, once in the mockConnect
    expect(mockConnect).toHaveBeenCalledTimes(1);
    expect(mockConnect).toHaveBeenCalledWith();
    expect(mockProvider.isConnected).toBe(true);
    expect(mockProvider.signAllTransactions).toHaveBeenCalledWith(versionedTransactions);
    expect(result).toEqual(transactions);
  });

  it("should throw error if connect fails when provider is not initially connected", async () => {
    const transactions = [mockTransactionA];
    mockProvider.isConnected = false;
    mockConnect.mockRejectedValue(new Error("ConnectionFailedError"));

    await expect(signAllTransactions(transactions)).rejects.toThrow("ConnectionFailedError");
    expect(mockConnect).toHaveBeenCalledTimes(1);
    expect(mockProvider.signAllTransactions).not.toHaveBeenCalled();
  });

  it("should throw error if provider is still not connected after connect attempt", async () => {
    const transactions = [mockTransactionA];
    mockProvider.isConnected = false;
    mockConnect.mockImplementation(async () => {
      const providerFromGetProvider = defaultGetProvider() as PhantomSolanaProvider | null;
      if (providerFromGetProvider) {
        providerFromGetProvider.isConnected = false; // Still false
      }
      return Promise.resolve("mockPublicKeyString");
    });

    await expect(signAllTransactions(transactions)).rejects.toThrow(
      "Provider is not connected even after attempting to connect.",
    );
    expect(mockConnect).toHaveBeenCalledTimes(1);
    expect(mockProvider.signAllTransactions).not.toHaveBeenCalled();
  });

  it("should handle an empty array of transactions", async () => {
    const transactions: Transaction[] = [];
    const versionedTransactions: VersionedTransaction[] = [];
    const expectedSignedTxs: Transaction[] = [];

    (mockProvider.signAllTransactions as jest.Mock).mockResolvedValue(versionedTransactions);
    (fromVersionedTransaction as jest.Mock).mockImplementation(() => undefined);
    mockProvider.isConnected = true;
    mockDefaultGetProvider.mockReturnValue(mockProvider as PhantomSolanaProvider);

    const result = await signAllTransactions(transactions);
    expect(mockProvider.signAllTransactions).toHaveBeenCalledWith(versionedTransactions);
    expect(result).toEqual(expectedSignedTxs);
  });
});
