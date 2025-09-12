import type { VersionedTransaction } from "@phantom/sdk-types";
import { signTransaction } from "./signTransaction";
import type { PhantomSolanaProvider } from "./types";
import type { SolanaStrategy } from "./strategies/types";
import { getProvider } from "./getProvider";

jest.mock("./getProvider", () => ({
  getProvider: jest.fn(),
}));

const mockTransaction = {} as VersionedTransaction;

describe("signTransaction", () => {
  let mockProvider: Partial<PhantomSolanaProvider>;

  beforeEach(() => {
    jest.clearAllMocks();
    mockProvider = {
      signTransaction: jest.fn(),
      isConnected: true,
      connect: jest.fn(),
    };
    (getProvider as jest.Mock).mockReturnValue(mockProvider as unknown as SolanaStrategy);
  });

  it("should properly call signTransaction on the provider", async () => {
    (mockProvider.signTransaction as jest.Mock).mockResolvedValue(mockTransaction);

    const result = await signTransaction(mockTransaction);

    expect(mockProvider.signTransaction).toHaveBeenCalledWith(mockTransaction);
    expect(result).toEqual(mockTransaction);
  });

  it("should throw an error if the provider is not found", async () => {
    (getProvider as jest.Mock).mockReturnValue(null);
    await expect(signTransaction(mockTransaction)).rejects.toThrow("Provider not found.");
  });

  it("should call connect if provider is not initially connected, then proceed with signTransaction", async () => {
    mockProvider.isConnected = false;
    (mockProvider.signTransaction as jest.Mock).mockResolvedValue(mockTransaction);

    const result = await signTransaction(mockTransaction);

    expect(getProvider).toHaveBeenCalledTimes(1);
    expect(mockProvider.connect).toHaveBeenCalledTimes(1);
    expect(mockProvider.signTransaction).toHaveBeenCalledWith(mockTransaction);
    expect(result).toEqual(mockTransaction);
  });
});
