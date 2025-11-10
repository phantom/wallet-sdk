import type { VersionedTransaction } from "@phantom/sdk-types";
import type { SolanaStrategy } from "./strategies/types";
import { getProvider } from "./getProvider";
import { signAndSendAllTransactions } from "./signAndSendAllTransactions";
import type { PhantomSolanaProvider } from "./types";

jest.mock("./getProvider", () => ({
  getProvider: jest.fn(),
}));

const mockTransaction = {
  serialize: jest.fn().mockReturnValue(new Uint8Array([])),
} as any as VersionedTransaction;

const mockTransactions = [mockTransaction, mockTransaction];

describe("signAndSendAllTransactions", () => {
  let mockProvider: Partial<PhantomSolanaProvider>;

  beforeEach(() => {
    jest.clearAllMocks();
    mockProvider = {
      signAndSendAllTransactions: jest.fn(),
      isConnected: true,
      connect: jest.fn(),
    };
    (getProvider as jest.Mock).mockReturnValue(mockProvider as unknown as SolanaStrategy);
  });

  it("should properly call signAndSendAllTransactions on the provider", async () => {
    const expectedResult = { signatures: ["mockSig1", "mockSig2"], address: "mockKey" };

    (mockProvider.signAndSendAllTransactions as jest.Mock).mockResolvedValue({
      signatures: ["mockSig1", "mockSig2"],
      address: "mockKey",
    });

    const result = await signAndSendAllTransactions(mockTransactions);

    expect(mockProvider.signAndSendAllTransactions).toHaveBeenCalledWith(mockTransactions);
    expect(result).toEqual(expectedResult);
  });

  it("should throw error if provider not found", async () => {
    (getProvider as jest.Mock).mockReturnValue(null);
    await expect(signAndSendAllTransactions(mockTransactions)).rejects.toThrow("Provider not found.");
  });

  it("should call connect if provider is not initially connected, then proceed", async () => {
    const expectedResult = { signatures: ["mockSig1", "mockSig2"], address: "mockKey" };
    mockProvider.isConnected = false;
    (mockProvider.signAndSendAllTransactions as jest.Mock).mockResolvedValue({
      signatures: ["mockSig1", "mockSig2"],
      address: "mockKey",
    });

    const result = await signAndSendAllTransactions(mockTransactions);

    expect(mockProvider.connect).toHaveBeenCalledTimes(1);
    expect(mockProvider.signAndSendAllTransactions).toHaveBeenCalledWith(mockTransactions);
    expect(result).toEqual(expectedResult);
  });

  it("should handle empty transactions array", async () => {
    const expectedResult = { signatures: [], address: "mockKey" };
    const emptyTransactions: VersionedTransaction[] = [];

    (mockProvider.signAndSendAllTransactions as jest.Mock).mockResolvedValue({
      signatures: [],
      address: "mockKey",
    });

    const result = await signAndSendAllTransactions(emptyTransactions);

    expect(mockProvider.signAndSendAllTransactions).toHaveBeenCalledWith(emptyTransactions);
    expect(result).toEqual(expectedResult);
  });
});
