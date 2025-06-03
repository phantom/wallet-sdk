import type { Transaction } from "@solana/kit";
import { signTransaction } from "./signTransaction";
import type { PhantomSolanaProvider } from "./types";
import { SolanaAdapter } from "./adapters/types";
import { getAdapter } from "./getAdapter";

jest.mock("./getAdapter", () => ({
  getAdapter: jest.fn(),
}));

const mockTransaction = {} as Transaction;

describe("signTransaction", () => {
  let mockAdapter: Partial<PhantomSolanaProvider>;

  beforeEach(() => {
    jest.clearAllMocks();
    mockAdapter = {
      signTransaction: jest.fn(),
      isConnected: true,
      connect: jest.fn(),
    };
    (getAdapter as jest.Mock).mockReturnValue(mockAdapter as unknown as SolanaAdapter);
  });

  it("should properly call signTransaction on the adapter", async () => {
    (mockAdapter.signTransaction as jest.Mock).mockResolvedValue(mockTransaction);

    const result = await signTransaction(mockTransaction);

    expect(mockAdapter.signTransaction).toHaveBeenCalledWith(mockTransaction);
    expect(result).toEqual(mockTransaction);
  });

  it("should throw an error if the adapter is not found", async () => {
    (getAdapter as jest.Mock).mockReturnValue(null);
    await expect(signTransaction(mockTransaction)).rejects.toThrow("Adapter not found.");
  });

  it("should call connect if adapter is not initially connected, then proceed with signTransaction", async () => {
    mockAdapter.isConnected = false;
    (mockAdapter.signTransaction as jest.Mock).mockResolvedValue(mockTransaction);

    const result = await signTransaction(mockTransaction);

    expect(getAdapter).toHaveBeenCalledTimes(1);
    expect(mockAdapter.connect).toHaveBeenCalledTimes(1);
    expect(mockAdapter.signTransaction).toHaveBeenCalledWith(mockTransaction);
    expect(result).toEqual(mockTransaction);
  });
});
