import { signAllTransactions } from "./signAllTransactions";
import { getProvider as defaultGetProvider } from "./getProvider";
import type { PhantomSolanaProvider } from "./types";
import type { Transaction, VersionedTransaction } from "@solana/web3.js";
import { connect } from "./connect";

jest.mock("./getProvider", () => ({
  getProvider: jest.fn(),
}));
jest.mock("./connect", () => ({
  connect: jest.fn(),
}));

const mockDefaultGetProvider = defaultGetProvider as jest.MockedFunction<() => PhantomSolanaProvider | null>;
const mockConnect = connect as jest.MockedFunction<typeof connect>;

const mockTransaction = {} as Transaction;
const mockVersionedTransaction = {} as VersionedTransaction;

describe("signAllTransactions", () => {
  let mockProvider: Partial<PhantomSolanaProvider>;

  beforeEach(() => {
    mockDefaultGetProvider.mockReset();
    mockConnect.mockReset();
    mockProvider = {
      signAllTransactions: jest.fn(),
      isConnected: true,
    };
    mockDefaultGetProvider.mockReturnValue(mockProvider as PhantomSolanaProvider);
  });

  it("should call provider.signAllTransactions", async () => {
    const transactions = [mockTransaction, mockVersionedTransaction];
    const expectedSignedTransactions = [...transactions];
    (mockProvider.signAllTransactions as jest.Mock).mockResolvedValue(expectedSignedTransactions);

    const result = await signAllTransactions(transactions);

    expect(mockDefaultGetProvider).toHaveBeenCalledTimes(1);
    expect(mockProvider.signAllTransactions).toHaveBeenCalledWith(transactions);
    expect(result).toEqual(expectedSignedTransactions);
  });

  it("should throw an error if provider is not found", async () => {
    mockDefaultGetProvider.mockReturnValue(null);
    await expect(signAllTransactions([mockTransaction])).rejects.toThrow("Phantom provider not found.");
  });

  it("should throw an error if provider does not support signAllTransactions", async () => {
    mockDefaultGetProvider.mockReturnValue({ isConnected: true } as PhantomSolanaProvider);
    await expect(signAllTransactions([mockTransaction])).rejects.toThrow(
      "The connected provider does not support signAllTransactions.",
    );
  });

  it("should call connect if provider is not initially connected, then proceed with signAllTransactions", async () => {
    const transactions = [mockTransaction];
    const expectedSignedTransactions = [...transactions];
    mockProvider.isConnected = false;

    mockConnect.mockImplementation(async () => {
      const providerFromGetProvider = defaultGetProvider() as PhantomSolanaProvider | null;
      if (providerFromGetProvider) {
        providerFromGetProvider.isConnected = true;
      }
      return Promise.resolve("mockPublicKeyString");
    });

    (mockProvider.signAllTransactions as jest.Mock).mockResolvedValue(expectedSignedTransactions);

    const result = await signAllTransactions(transactions);

    expect(mockDefaultGetProvider).toHaveBeenCalledTimes(2); // Once in the main function, once in the mockConnect
    expect(mockConnect).toHaveBeenCalledTimes(1);
    expect(mockConnect).toHaveBeenCalledWith();
    expect(mockProvider.isConnected).toBe(true);
    expect(mockProvider.signAllTransactions).toHaveBeenCalledWith(transactions);
    expect(result).toEqual(expectedSignedTransactions);
  });

  it("should throw error if connect fails when provider is not initially connected", async () => {
    const transactions = [mockTransaction];
    mockProvider.isConnected = false;
    mockConnect.mockRejectedValue(new Error("ConnectionFailedError"));

    await expect(signAllTransactions(transactions)).rejects.toThrow("ConnectionFailedError");
    expect(mockConnect).toHaveBeenCalledTimes(1);
    expect(mockProvider.signAllTransactions).not.toHaveBeenCalled();
  });

  it("should throw error if provider is still not connected after connect attempt", async () => {
    const transactions = [mockTransaction];
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
    const transactions: (Transaction | VersionedTransaction)[] = [];
    const expectedSignedTransactions: (Transaction | VersionedTransaction)[] = [];
    (mockProvider.signAllTransactions as jest.Mock).mockResolvedValue(expectedSignedTransactions);
    mockProvider.isConnected = true;
    mockDefaultGetProvider.mockReturnValue(mockProvider as PhantomSolanaProvider);

    const result = await signAllTransactions(transactions);
    expect(mockProvider.signAllTransactions).toHaveBeenCalledWith(transactions);
    expect(result).toEqual(expectedSignedTransactions);
  });
});
