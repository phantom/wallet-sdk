import { signTransaction } from "./signTransaction";
import { getProvider as defaultGetProvider } from "./getProvider";
import type { PhantomSolanaProvider, SolanaOperationOptions } from "./types";
import type { Transaction, VersionedTransaction } from "@solana/web3.js";

jest.mock("./getProvider", () => ({
  getProvider: jest.fn(),
}));
const mockDefaultGetProvider = defaultGetProvider as jest.MockedFunction<() => PhantomSolanaProvider | null>;

const mockTransaction = {} as Transaction;
const mockVersionedTransaction = {} as VersionedTransaction;

describe("signTransaction", () => {
  let mockProvider: Partial<PhantomSolanaProvider>;
  let customMockGetProvider: jest.MockedFunction<() => PhantomSolanaProvider | null>;

  beforeEach(() => {
    mockDefaultGetProvider.mockReset();
    customMockGetProvider = jest.fn();
    mockProvider = {
      signTransaction: jest.fn(),
      isConnected: true,
    };
    mockDefaultGetProvider.mockReturnValue(mockProvider as PhantomSolanaProvider);
  });

  it("should use default getProvider and call provider.signTransaction for a legacy transaction", async () => {
    const expectedSignedTransaction = mockTransaction;
    (mockProvider.signTransaction as jest.Mock).mockResolvedValue(expectedSignedTransaction);

    const result = await signTransaction(mockTransaction); // No options

    expect(mockDefaultGetProvider).toHaveBeenCalledTimes(1);
    expect(customMockGetProvider).not.toHaveBeenCalled();
    expect(mockProvider.signTransaction).toHaveBeenCalledWith(mockTransaction);
    expect(result).toEqual(expectedSignedTransaction);
  });

  it("should use custom getProvider and call provider.signTransaction for a versioned transaction", async () => {
    const expectedSignedTransaction = mockVersionedTransaction;
    const customProvider = { ...mockProvider, signTransaction: jest.fn().mockResolvedValue(expectedSignedTransaction) };
    customMockGetProvider.mockReturnValue(customProvider as PhantomSolanaProvider);

    const options: SolanaOperationOptions = { getProvider: customMockGetProvider };
    const result = await signTransaction(mockVersionedTransaction, options);

    expect(customMockGetProvider).toHaveBeenCalledTimes(1);
    expect(mockDefaultGetProvider).not.toHaveBeenCalled();
    expect(customProvider.signTransaction).toHaveBeenCalledWith(mockVersionedTransaction);
    expect(result).toEqual(expectedSignedTransaction);
  });

  it("should throw an error if provider is not found (default getProvider)", async () => {
    mockDefaultGetProvider.mockReturnValue(null);
    await expect(signTransaction(mockTransaction)).rejects.toThrow("Phantom provider not found.");
  });

  it("should throw an error if provider is not found (custom getProvider)", async () => {
    customMockGetProvider.mockReturnValue(null);
    const options: SolanaOperationOptions = { getProvider: customMockGetProvider };
    await expect(signTransaction(mockTransaction, options)).rejects.toThrow("Phantom provider not found.");
  });

  it("should throw an error if provider does not support signTransaction", async () => {
    mockDefaultGetProvider.mockReturnValue({ isConnected: true } as PhantomSolanaProvider); // No signTransaction method
    await expect(signTransaction(mockTransaction)).rejects.toThrow(
      "The connected provider does not support signTransaction.",
    );
  });

  it("should throw an error if provider is not connected", async () => {
    mockDefaultGetProvider.mockReturnValue({ ...mockProvider, isConnected: false } as PhantomSolanaProvider);
    await expect(signTransaction(mockTransaction)).rejects.toThrow("Provider is not connected.");
  });
});
