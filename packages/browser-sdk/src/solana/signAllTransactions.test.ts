import { signAllTransactions } from "./signAllTransactions";
import { getProvider as defaultGetProvider } from "./getProvider";
import type { PhantomSolanaProvider, SolanaOperationOptions } from "./types";
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
  let customMockGetProvider: jest.MockedFunction<() => PhantomSolanaProvider | null>;

  beforeEach(() => {
    mockDefaultGetProvider.mockReset();
    customMockGetProvider = jest.fn();
    mockConnect.mockReset();
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
    const customProviderInstance = {
      ...mockProvider,
      signAllTransactions: jest.fn().mockResolvedValue(expectedSignedTransactions),
    };
    customMockGetProvider.mockReturnValue(customProviderInstance as PhantomSolanaProvider);

    const options: SolanaOperationOptions = { getProvider: customMockGetProvider };
    const result = await signAllTransactions(transactions, options);

    expect(customMockGetProvider).toHaveBeenCalledTimes(1);
    expect(mockDefaultGetProvider).not.toHaveBeenCalled();
    expect(customProviderInstance.signAllTransactions).toHaveBeenCalledWith(transactions);
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

  it("should call connect if provider is not initially connected, then proceed with signAllTransactions", async () => {
    const transactions = [mockTransaction];
    const expectedSignedTransactions = [...transactions];
    mockProvider.isConnected = false;
    // mockDefaultGetProvider.mockReturnValue(mockProvider as PhantomSolanaProvider); // Set in beforeEach

    mockConnect.mockImplementation(optionsPassedToConnect => {
      const providerFromGetProvider = (
        optionsPassedToConnect?.getProvider || defaultGetProvider
      )() as PhantomSolanaProvider | null;
      if (providerFromGetProvider) {
        providerFromGetProvider.isConnected = true;
      }
      return Promise.resolve("mockPublicKeyString");
    });

    (mockProvider.signAllTransactions as jest.Mock).mockResolvedValue(expectedSignedTransactions);

    const result = await signAllTransactions(transactions);

    expect(mockDefaultGetProvider).toHaveBeenCalledTimes(1);
    expect(mockConnect).toHaveBeenCalledTimes(1);
    expect(mockConnect).toHaveBeenCalledWith({ getProvider: defaultGetProvider });
    expect(mockProvider.isConnected).toBe(true);
    expect(mockProvider.signAllTransactions).toHaveBeenCalledWith(transactions);
    expect(result).toEqual(expectedSignedTransactions);
  });

  it("should throw error if connect fails when provider is not initially connected", async () => {
    const transactions = [mockTransaction];
    mockProvider.isConnected = false;
    // mockDefaultGetProvider.mockReturnValue(mockProvider as PhantomSolanaProvider);
    mockConnect.mockRejectedValue(new Error("ConnectionFailedError"));

    await expect(signAllTransactions(transactions)).rejects.toThrow("ConnectionFailedError");
    expect(mockConnect).toHaveBeenCalledTimes(1);
    expect(mockProvider.signAllTransactions).not.toHaveBeenCalled();
  });

  it("should throw error if provider is still not connected after connect attempt", async () => {
    const transactions = [mockTransaction];
    mockProvider.isConnected = false;
    // mockDefaultGetProvider.mockReturnValue(mockProvider as PhantomSolanaProvider);
    mockConnect.mockImplementation(optionsPassedToConnect => {
      const providerFromGetProvider = (
        optionsPassedToConnect?.getProvider || defaultGetProvider
      )() as PhantomSolanaProvider | null;
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

  it("should handle an empty array of transactions with default provider", async () => {
    const transactions: (Transaction | VersionedTransaction)[] = [];
    const expectedSignedTransactions: (Transaction | VersionedTransaction)[] = [];
    (mockProvider.signAllTransactions as jest.Mock).mockResolvedValue(expectedSignedTransactions);
    // Ensure provider is connected for this specific path if connect logic isn't triggered by empty array path
    mockProvider.isConnected = true;
    mockDefaultGetProvider.mockReturnValue(mockProvider as PhantomSolanaProvider);

    const result = await signAllTransactions(transactions);
    expect(mockProvider.signAllTransactions).toHaveBeenCalledWith(transactions);
    expect(result).toEqual(expectedSignedTransactions);
  });

  it("should handle an empty array of transactions with custom provider", async () => {
    const transactions: (Transaction | VersionedTransaction)[] = [];
    const expectedSignedTransactions: (Transaction | VersionedTransaction)[] = [];
    const customProviderInstance = {
      ...mockProvider,
      signAllTransactions: jest.fn().mockResolvedValue(expectedSignedTransactions),
      isConnected: true, // Ensure connected for this path
    };
    customMockGetProvider.mockReturnValue(customProviderInstance as PhantomSolanaProvider);
    const options: SolanaOperationOptions = { getProvider: customMockGetProvider };

    const result = await signAllTransactions(transactions, options);
    expect(customProviderInstance.signAllTransactions).toHaveBeenCalledWith(transactions);
    expect(result).toEqual(expectedSignedTransactions);
  });
});
