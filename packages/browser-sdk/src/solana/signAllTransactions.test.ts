import type { Transaction } from "@solana/kit";
import { getAdapter } from "./getAdapter";
import { SolanaAdapter } from "./adapters/types";
import { signAllTransactions } from "./signAllTransactions";

jest.mock("./getAdapter", () => ({
  getAdapter: jest.fn(),
}));

const mockTransactionA = {} as Transaction;
const mockTransactionB = {} as Transaction;

describe("signAllTransactions", () => {
  let mockAdapter: Partial<SolanaAdapter>;

  beforeEach(() => {
    jest.clearAllMocks();
    mockAdapter = {
      signAllTransactions: jest.fn(),
      isConnected: true,
      connect: jest.fn(),
    };
    (getAdapter as jest.Mock).mockReturnValue(mockAdapter as unknown as SolanaAdapter);
  });

  it("should properly call signAllTransactions on the adapter", async () => {
    const transactions = [mockTransactionA, mockTransactionB];
    (mockAdapter.signAllTransactions as jest.Mock).mockResolvedValue(transactions);
    const result = await signAllTransactions(transactions);
    expect(mockAdapter.signAllTransactions).toHaveBeenCalledWith(transactions);
    expect(result).toEqual(transactions);
  });

  it("should throw an error if adapter is not found", async () => {
    (getAdapter as jest.Mock).mockReturnValue(null);
    await expect(signAllTransactions([mockTransactionA])).rejects.toThrow("Adapter not found.");
  });

  it("should call connect if not initially connected, then proceed with signAllTransactions", async () => {
    const transactions = [mockTransactionA];
    mockAdapter.isConnected = false;
    (mockAdapter.signAllTransactions as jest.Mock).mockResolvedValue(transactions);

    const result = await signAllTransactions(transactions);

    expect(getAdapter).toHaveBeenCalled();
    expect(mockAdapter.connect).toHaveBeenCalled();
    expect(mockAdapter.signAllTransactions).toHaveBeenCalledWith(transactions);
    expect(result).toEqual(transactions);
  });

  it("should handle an empty array of transactions", async () => {
    const transactions: Transaction[] = [];

    (mockAdapter.signAllTransactions as jest.Mock).mockResolvedValue(transactions);
    mockAdapter.isConnected = true;

    const result = await signAllTransactions(transactions);
    expect(mockAdapter.signAllTransactions).toHaveBeenCalledWith(transactions);
    expect(result).toEqual(transactions);
  });
});
