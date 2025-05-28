import { signTransaction } from "./signTransaction";
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

describe("signTransaction", () => {
  let mockProvider: Partial<PhantomSolanaProvider>;

  beforeEach(() => {
    mockDefaultGetProvider.mockReset();
    mockConnect.mockReset();
    mockProvider = {
      signTransaction: jest.fn(),
      isConnected: true,
    };
    mockDefaultGetProvider.mockReturnValue(mockProvider as PhantomSolanaProvider);
  });

  it("should call provider.signTransaction for a legacy transaction", async () => {
    const expectedSignedTransaction = mockTransaction;
    (mockProvider.signTransaction as jest.Mock).mockResolvedValue(expectedSignedTransaction);

    const result = await signTransaction(mockTransaction);

    expect(mockDefaultGetProvider).toHaveBeenCalledTimes(1);
    expect(mockProvider.signTransaction).toHaveBeenCalledWith(mockTransaction);
    expect(result).toEqual(expectedSignedTransaction);
  });

  it("should call provider.signTransaction for a versioned transaction", async () => {
    const expectedSignedTransaction = mockVersionedTransaction;
    (mockProvider.signTransaction as jest.Mock).mockResolvedValue(expectedSignedTransaction);

    const result = await signTransaction(mockVersionedTransaction);

    expect(mockDefaultGetProvider).toHaveBeenCalledTimes(1);
    expect(mockProvider.signTransaction).toHaveBeenCalledWith(mockVersionedTransaction);
    expect(result).toEqual(expectedSignedTransaction);
  });

  it("should throw an error if provider is not found", async () => {
    mockDefaultGetProvider.mockReturnValue(null);
    await expect(signTransaction(mockTransaction)).rejects.toThrow("Phantom provider not found.");
  });

  it("should throw an error if provider does not support signTransaction", async () => {
    mockDefaultGetProvider.mockReturnValue({ isConnected: true } as PhantomSolanaProvider);
    await expect(signTransaction(mockTransaction)).rejects.toThrow(
      "The connected provider does not support signTransaction.",
    );
  });

  it("should call connect if provider is not initially connected, then proceed with signTransaction", async () => {
    const expectedSignedTransaction = mockTransaction;
    mockProvider.isConnected = false;

    mockConnect.mockImplementation(async () => {
      const providerFromGetProvider = defaultGetProvider() as PhantomSolanaProvider | null;
      if (providerFromGetProvider) {
        providerFromGetProvider.isConnected = true;
      }
      return Promise.resolve("mockPublicKeyString");
    });

    (mockProvider.signTransaction as jest.Mock).mockResolvedValue(expectedSignedTransaction);

    const result = await signTransaction(mockTransaction);

    expect(mockDefaultGetProvider).toHaveBeenCalledTimes(2);
    expect(mockConnect).toHaveBeenCalledTimes(1);
    expect(mockConnect).toHaveBeenCalledWith();
    expect(mockProvider.isConnected).toBe(true);
    expect(mockProvider.signTransaction).toHaveBeenCalledWith(mockTransaction);
    expect(result).toEqual(expectedSignedTransaction);
  });

  it("should throw error if connect fails when provider is not initially connected", async () => {
    mockProvider.isConnected = false;
    mockConnect.mockRejectedValue(new Error("ConnectionFailedError"));

    await expect(signTransaction(mockTransaction)).rejects.toThrow("ConnectionFailedError");
    expect(mockConnect).toHaveBeenCalledTimes(1);
    expect(mockProvider.signTransaction).not.toHaveBeenCalled();
  });

  it("should throw error if provider is still not connected after connect attempt", async () => {
    mockProvider.isConnected = false;
    mockConnect.mockImplementation(async () => {
      const providerFromGetProvider = defaultGetProvider() as PhantomSolanaProvider | null;
      if (providerFromGetProvider) {
        providerFromGetProvider.isConnected = false;
      }
      return Promise.resolve("mockPublicKeyString");
    });

    await expect(signTransaction(mockTransaction)).rejects.toThrow(
      "Provider is not connected even after attempting to connect.",
    );
    expect(mockConnect).toHaveBeenCalledTimes(1);
    expect(mockProvider.signTransaction).not.toHaveBeenCalled();
  });
});
