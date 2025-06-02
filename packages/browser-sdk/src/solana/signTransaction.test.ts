import { signTransaction } from "./signTransaction";
import { getProvider as defaultGetProvider } from "./getProvider";
import type { PhantomSolanaProvider } from "./types";
import type { Transaction } from "@solana/kit";
import type { VersionedTransaction } from "@solana/web3.js";
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

jest.mock("./utils/transactionToVersionedTransaction", () => ({
  transactionToVersionedTransaction: jest.fn(),
}));
jest.mock("@solana/compat", () => ({
  fromVersionedTransaction: jest.fn(),
}));

import { transactionToVersionedTransaction } from "./utils/transactionToVersionedTransaction";
import { fromVersionedTransaction } from "@solana/compat";

describe("signTransaction", () => {
  let mockProvider: Partial<PhantomSolanaProvider>;

  beforeEach(() => {
    mockDefaultGetProvider.mockReset();
    mockConnect.mockReset();
    (transactionToVersionedTransaction as jest.Mock).mockReset();
    (fromVersionedTransaction as jest.Mock).mockReset();
    mockProvider = {
      signTransaction: jest.fn(),
      isConnected: true,
    };
    mockDefaultGetProvider.mockReturnValue(mockProvider as PhantomSolanaProvider);
  });

  it("should call provider.signTransaction with converted transaction and return Kit transaction", async () => {
    (transactionToVersionedTransaction as jest.Mock).mockReturnValue(mockVersionedTransaction);
    (mockProvider.signTransaction as jest.Mock).mockResolvedValue(mockVersionedTransaction);
    (fromVersionedTransaction as jest.Mock).mockReturnValue(mockTransaction);

    const result = await signTransaction(mockTransaction);

    expect(transactionToVersionedTransaction).toHaveBeenCalledWith(mockTransaction);
    expect(mockProvider.signTransaction).toHaveBeenCalledWith(mockVersionedTransaction);
    expect(fromVersionedTransaction).toHaveBeenCalledWith(mockVersionedTransaction);
    expect(result).toEqual(mockTransaction);
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

    (transactionToVersionedTransaction as jest.Mock).mockReturnValue(mockVersionedTransaction);
    (mockProvider.signTransaction as jest.Mock).mockResolvedValue(mockVersionedTransaction);
    (fromVersionedTransaction as jest.Mock).mockReturnValue(expectedSignedTransaction);

    const result = await signTransaction(mockTransaction);

    expect(mockDefaultGetProvider).toHaveBeenCalledTimes(2);
    expect(mockConnect).toHaveBeenCalledTimes(1);
    expect(mockConnect).toHaveBeenCalledWith();
    expect(mockProvider.isConnected).toBe(true);
    expect(mockProvider.signTransaction).toHaveBeenCalledWith(mockVersionedTransaction);
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
