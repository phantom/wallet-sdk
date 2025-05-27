import { signAndSendTransaction } from "./signAndSendTransaction";
import { getProvider as defaultGetProvider } from "./getProvider";
import type { PhantomSolanaProvider, SolanaOperationOptions } from "./types";
import type { Transaction, VersionedTransaction } from "@solana/web3.js";

jest.mock("./getProvider", () => ({
  getProvider: jest.fn(),
}));
const mockDefaultGetProvider = defaultGetProvider as jest.MockedFunction<() => PhantomSolanaProvider | null>;

// Mock Transaction and VersionedTransaction if their instances are directly used or specific methods called.
// For this example, we'll assume they are passed through and types are sufficient.
const mockTransaction = {} as Transaction; // Simplified mock
const mockVersionedTransaction = {} as VersionedTransaction; // Simplified mock

describe("signAndSendTransaction", () => {
  let mockProvider: Partial<PhantomSolanaProvider>;
  let customMockGetProvider: jest.MockedFunction<() => PhantomSolanaProvider | null>;

  beforeEach(() => {
    mockDefaultGetProvider.mockReset();
    customMockGetProvider = jest.fn();
    mockProvider = {
      signAndSendTransaction: jest.fn(),
      isConnected: true, // Default to connected
    };
    mockDefaultGetProvider.mockReturnValue(mockProvider as PhantomSolanaProvider);
  });

  it("should use default getProvider for a legacy transaction", async () => {
    const expectedResult = { signature: "mockSig", publicKey: "mockKey" };
    (mockProvider.signAndSendTransaction as jest.Mock).mockResolvedValue(expectedResult);

    const result = await signAndSendTransaction(mockTransaction);

    expect(mockDefaultGetProvider).toHaveBeenCalledTimes(1);
    expect(customMockGetProvider).not.toHaveBeenCalled();
    expect(mockProvider.signAndSendTransaction).toHaveBeenCalledWith(mockTransaction);
    expect(result).toEqual(expectedResult);
  });

  it("should use custom getProvider for a versioned transaction", async () => {
    const expectedResult = { signature: "mockSigV", publicKey: "mockKeyV" };
    const customProvider = { ...mockProvider, signAndSendTransaction: jest.fn().mockResolvedValue(expectedResult) };
    customMockGetProvider.mockReturnValue(customProvider as PhantomSolanaProvider);

    const operationOptions: SolanaOperationOptions = { getProvider: customMockGetProvider };
    const result = await signAndSendTransaction(mockVersionedTransaction, operationOptions);

    expect(customMockGetProvider).toHaveBeenCalledTimes(1);
    expect(mockDefaultGetProvider).not.toHaveBeenCalled();
    expect(customProvider.signAndSendTransaction).toHaveBeenCalledWith(mockVersionedTransaction, undefined);
    expect(result).toEqual(expectedResult);
  });

  it("should throw error if provider not found (default getProvider)", async () => {
    mockDefaultGetProvider.mockReturnValue(null);
    await expect(signAndSendTransaction(mockTransaction)).rejects.toThrow("Phantom provider not found.");
  });

  it("should throw error if provider not found (custom getProvider)", async () => {
    customMockGetProvider.mockReturnValue(null);
    const operationOptions: SolanaOperationOptions = { getProvider: customMockGetProvider };
    await expect(signAndSendTransaction(mockTransaction, operationOptions)).rejects.toThrow(
      "Phantom provider not found.",
    );
  });

  it("should throw error if provider does not support method", async () => {
    mockDefaultGetProvider.mockReturnValue({ isConnected: true } as PhantomSolanaProvider);
    await expect(signAndSendTransaction(mockTransaction)).rejects.toThrow(
      "The connected provider does not support signAndSendTransaction.",
    );
  });

  it("should throw error if provider is not connected", async () => {
    mockDefaultGetProvider.mockReturnValue({ ...mockProvider, isConnected: false } as PhantomSolanaProvider);
    await expect(signAndSendTransaction(mockTransaction)).rejects.toThrow("Provider is not connected.");
  });
});
