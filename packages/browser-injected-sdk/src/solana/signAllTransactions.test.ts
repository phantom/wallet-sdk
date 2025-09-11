import type { Transaction, VersionedTransaction } from "@phantom/sdk-types";
import { getProvider } from "./getProvider";
import type { SolanaStrategy } from "./strategies/types";
import { signAllTransactions } from "./signAllTransactions";

jest.mock("./getProvider", () => ({
  getProvider: jest.fn(),
}));

const mockTransactionA = {} as VersionedTransaction;
const mockTransactionB = {} as VersionedTransaction;

describe("signAllTransactions", () => {
  let mockProvider: Partial<SolanaStrategy>;

  beforeEach(() => {
    jest.clearAllMocks();
    mockProvider = {
      signAllTransactions: jest.fn(),
      isConnected: true,
      connect: jest.fn(),
    };
    (getProvider as jest.Mock).mockReturnValue(mockProvider as unknown as SolanaStrategy);
  });

  it("should properly call signAllTransactions on the provider", async () => {
    const transactions = [mockTransactionA, mockTransactionB];
    (mockProvider.signAllTransactions as jest.Mock).mockResolvedValue(transactions);
    const result = await signAllTransactions(transactions);
    expect(mockProvider.signAllTransactions).toHaveBeenCalledWith(transactions);
    expect(result).toEqual(transactions);
  });

  it("should throw an error if provider is not found", async () => {
    (getProvider as jest.Mock).mockReturnValue(null);
    await expect(signAllTransactions([mockTransactionA])).rejects.toThrow("Provider not found.");
  });

  it("should call connect if not initially connected, then proceed with signAllTransactions", async () => {
    const transactions = [mockTransactionA];
    mockProvider.isConnected = false;
    (mockProvider.signAllTransactions as jest.Mock).mockResolvedValue(transactions);

    const result = await signAllTransactions(transactions);

    expect(getProvider).toHaveBeenCalled();
    expect(mockProvider.connect).toHaveBeenCalled();
    expect(mockProvider.signAllTransactions).toHaveBeenCalledWith(transactions);
    expect(result).toEqual(transactions);
  });

  it("should handle an empty array of transactions", async () => {
    const transactions: (Transaction | VersionedTransaction)[] = [];

    (mockProvider.signAllTransactions as jest.Mock).mockResolvedValue(transactions);
    mockProvider.isConnected = true;

    const result = await signAllTransactions(transactions);
    expect(mockProvider.signAllTransactions).toHaveBeenCalledWith(transactions);
    expect(result).toEqual(transactions);
  });
});
