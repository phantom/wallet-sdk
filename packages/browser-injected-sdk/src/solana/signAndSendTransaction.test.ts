import type { VersionedTransaction } from "@phantom/sdk-types";
import type { SolanaStrategy } from "./strategies/types";
import { getProvider } from "./getProvider";
import { signAndSendTransaction } from "./signAndSendTransaction";
import type { PhantomSolanaProvider } from "./types";
import { SOLANA_PROVIDER_NOT_FOUND } from "../errors";

jest.mock("./getProvider", () => ({
  getProvider: jest.fn(),
}));

const mockTransaction = {
  serialize: jest.fn().mockReturnValue(new Uint8Array([])),
} as any as VersionedTransaction;

describe("signAndSendTransaction", () => {
  let mockProvider: Partial<PhantomSolanaProvider>;

  beforeEach(() => {
    jest.clearAllMocks();
    mockProvider = {
      signAndSendTransaction: jest.fn(),
      isConnected: true,
      connect: jest.fn(),
    };
    (getProvider as jest.Mock).mockReturnValue(mockProvider as unknown as SolanaStrategy);
  });

  it("should properly call signAndSendTransaction on the provider", async () => {
    const expectedResult = { signature: "mockSig", address: "mockKey" };

    (mockProvider.signAndSendTransaction as jest.Mock).mockResolvedValue({
      signature: "mockSig",
      address: "mockKey",
    });

    const result = await signAndSendTransaction(mockTransaction);

    expect(mockProvider.signAndSendTransaction).toHaveBeenCalledWith(mockTransaction);
    expect(result).toEqual(expectedResult);
  });

  it("should throw error when Solana provider is not found", async () => {
    (getProvider as jest.Mock).mockRejectedValue(new Error(SOLANA_PROVIDER_NOT_FOUND));

    await expect(signAndSendTransaction(mockTransaction)).rejects.toThrow(SOLANA_PROVIDER_NOT_FOUND);
  });

  it("should call connect if provider is not initially connected, then proceed", async () => {
    const expectedResult = { signature: "mockSig", address: "mockKey" };
    mockProvider.isConnected = false;
    (mockProvider.signAndSendTransaction as jest.Mock).mockResolvedValue({
      signature: "mockSig",
      address: "mockKey",
    });

    const result = await signAndSendTransaction(mockTransaction);

    expect(mockProvider.connect).toHaveBeenCalledTimes(1);
    expect(mockProvider.signAndSendTransaction).toHaveBeenCalledWith(mockTransaction);
    expect(result).toEqual(expectedResult);
  });
});
