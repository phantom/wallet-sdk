import { signAllTransactions } from "./signAllTransactions";
import { getProvider as defaultGetProvider } from "./getProvider";
import type { PhantomSolanaProvider, SolanaOperationOptions } from "./types";
import type { Transaction, VersionedTransaction } from "@solana/web3.js";

jest.mock("./getProvider", () => ({
  getProvider: jest.fn(),
}));
const mockDefaultGetProvider = defaultGetProvider as jest.MockedFunction<() => PhantomSolanaProvider | null>;

const mockTransaction = {} as Transaction;
const mockVersionedTransaction = {} as VersionedTransaction;

describe("signAllTransactions", () => {
  let mockProvider: Partial<PhantomSolanaProvider>;
  let customMockGetProvider: jest.MockedFunction<() => PhantomSolanaProvider | null>;

  beforeEach(() => {
    mockDefaultGetProvider.mockReset();
    customMockGetProvider = jest.fn();
    mockProvider = {
      signAllTransactions: jest.fn(),
      isConnected: true,
    };
    mockDefaultGetProvider.mockReturnValue(mockProvider as PhantomSolanaProvider);
  });

  it("should use default getProvider and call provider.signAllTransactions", async () => {
    const transactions = [mockTransaction, mockVersionedTransaction];
    const expectedSignedTransactions = [...transactions]; // Mock returns them as is
    (mockProvider.signAllTransactions as jest.Mock).mockResolvedValue(expectedSignedTransactions);

    const result = await signAllTransactions(transactions);

    expect(mockDefaultGetProvider).toHaveBeenCalledTimes(1);
    expect(customMockGetProvider).not.toHaveBeenCalled();
    expect(mockProvider.signAllTransactions).toHaveBeenCalledWith(transactions);
    expect(result).toEqual(expectedSignedTransactions);
  });

  it("should use custom getProvider and call provider.signAllTransactions", async () => {
    const transactions = [mockTransaction];
    const expectedSignedTransactions = [...transactions];
    const customProvider = {
      ...mockProvider,
      signAllTransactions: jest.fn().mockResolvedValue(expectedSignedTransactions),
    };
    customMockGetProvider.mockReturnValue(customProvider as PhantomSolanaProvider);

    const options: SolanaOperationOptions = { getProvider: customMockGetProvider };
    const result = await signAllTransactions(transactions, options);

    expect(customMockGetProvider).toHaveBeenCalledTimes(1);
    expect(mockDefaultGetProvider).not.toHaveBeenCalled();
    expect(customProvider.signAllTransactions).toHaveBeenCalledWith(transactions);
    expect(result).toEqual(expectedSignedTransactions);
  });

  it("should throw an error if provider is not found (default getProvider)", async () => {
    mockDefaultGetProvider.mockReturnValue(null);
    await expect(signAllTransactions([mockTransaction])).rejects.toThrow("Phantom provider not found.");
  });

  it("should throw an error if provider is not found (custom getProvider)", async () => {
    customMockGetProvider.mockReturnValue(null);
    const options: SolanaOperationOptions = { getProvider: customMockGetProvider };
    await expect(signAllTransactions([mockTransaction], options)).rejects.toThrow("Phantom provider not found.");
  });

  it("should throw an error if provider does not support signAllTransactions", async () => {
    mockDefaultGetProvider.mockReturnValue({ isConnected: true } as PhantomSolanaProvider);
    await expect(signAllTransactions([mockTransaction])).rejects.toThrow(
      "The connected provider does not support signAllTransactions.",
    );
  });

  it("should throw an error if provider is not connected", async () => {
    mockDefaultGetProvider.mockReturnValue({ ...mockProvider, isConnected: false } as PhantomSolanaProvider);
    await expect(signAllTransactions([mockTransaction])).rejects.toThrow("Provider is not connected.");
  });

  it("should handle an empty array of transactions with default provider", async () => {
    const transactions: (Transaction | VersionedTransaction)[] = [];
    const expectedSignedTransactions: (Transaction | VersionedTransaction)[] = [];
    (mockProvider.signAllTransactions as jest.Mock).mockResolvedValue(expectedSignedTransactions);

    const result = await signAllTransactions(transactions);
    expect(mockProvider.signAllTransactions).toHaveBeenCalledWith(transactions);
    expect(result).toEqual(expectedSignedTransactions);
  });

  it("should handle an empty array of transactions with custom provider", async () => {
    const transactions: (Transaction | VersionedTransaction)[] = [];
    const expectedSignedTransactions: (Transaction | VersionedTransaction)[] = [];
    const customProvider = {
      ...mockProvider,
      signAllTransactions: jest.fn().mockResolvedValue(expectedSignedTransactions),
    };
    customMockGetProvider.mockReturnValue(customProvider as PhantomSolanaProvider);
    const options: SolanaOperationOptions = { getProvider: customMockGetProvider };

    const result = await signAllTransactions(transactions, options);
    expect(customProvider.signAllTransactions).toHaveBeenCalledWith(transactions);
    expect(result).toEqual(expectedSignedTransactions);
  });
});
