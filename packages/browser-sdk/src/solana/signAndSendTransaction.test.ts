import type { Transaction } from "@solana/kit";
import type { SolanaAdapter } from "./adapters/types";
import { getAdapter } from "./getAdapter";
import { signAndSendTransaction } from "./signAndSendTransaction";
import type { PhantomSolanaProvider } from "./types";

jest.mock("./getAdapter", () => ({
  getAdapter: jest.fn(),
}));

const mockTransaction = {
  messageBytes: jest.fn().mockReturnValue(new Uint8Array([])),
} as any as Transaction;

describe("signAndSendTransaction", () => {
  let mockAdapter: Partial<PhantomSolanaProvider>;

  beforeEach(() => {
    jest.clearAllMocks();
    mockAdapter = {
      signAndSendTransaction: jest.fn(),
      isConnected: true,
      connect: jest.fn(),
    };
    (getAdapter as jest.Mock).mockReturnValue(mockAdapter as unknown as SolanaAdapter);
  });

  it("should properly call signAndSendTransaction on the adapter", async () => {
    const expectedResult = { signature: "mockSig", address: "mockKey" };

    (mockAdapter.signAndSendTransaction as jest.Mock).mockResolvedValue({
      signature: "mockSig",
      address: "mockKey",
    });

    const result = await signAndSendTransaction(mockTransaction);

    expect(mockAdapter.signAndSendTransaction).toHaveBeenCalledWith(mockTransaction);
    expect(result).toEqual(expectedResult);
  });

  it("should throw error if adapter not found", async () => {
    (getAdapter as jest.Mock).mockReturnValue(null);
    await expect(signAndSendTransaction(mockTransaction)).rejects.toThrow("Adapter not found.");
  });

  it("should call connect if adapter is not initially connected, then proceed", async () => {
    const expectedResult = { signature: "mockSig", address: "mockKey" };
    mockAdapter.isConnected = false;
    (mockAdapter.signAndSendTransaction as jest.Mock).mockResolvedValue({
      signature: "mockSig",
      address: "mockKey",
    });

    const result = await signAndSendTransaction(mockTransaction);

    expect(mockAdapter.connect).toHaveBeenCalledTimes(1);
    expect(mockAdapter.signAndSendTransaction).toHaveBeenCalledWith(mockTransaction);
    expect(result).toEqual(expectedResult);
  });
});
