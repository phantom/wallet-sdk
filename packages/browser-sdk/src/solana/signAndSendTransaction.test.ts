import { signAndSendTransaction } from "./signAndSendTransaction";
import { getProvider as defaultGetProvider } from "./getProvider";
import type { PhantomSolanaProvider } from "./types";
import type { Transaction } from "@solana/web3.js";
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

describe("signAndSendTransaction", () => {
  let mockProvider: Partial<PhantomSolanaProvider>;

  beforeEach(() => {
    mockDefaultGetProvider.mockReset();
    mockConnect.mockReset(); // Reset connect mock
    mockProvider = {
      signAndSendTransaction: jest.fn(),
      isConnected: true, // Default to connected
    };
    mockDefaultGetProvider.mockReturnValue(mockProvider as PhantomSolanaProvider);
  });

  it("should use default getProvider for a transaction", async () => {
    const expectedResult = { signature: "mockSig", publicKey: "mockKey" };
    (mockProvider.signAndSendTransaction as jest.Mock).mockResolvedValue(expectedResult);

    const result = await signAndSendTransaction(mockTransaction);

    expect(mockDefaultGetProvider).toHaveBeenCalledTimes(1);
    expect(mockProvider.signAndSendTransaction).toHaveBeenCalledWith(mockTransaction);
    expect(result).toEqual(expectedResult);
  });

  it("should throw error if provider not found", async () => {
    mockDefaultGetProvider.mockReturnValue(null);
    await expect(signAndSendTransaction(mockTransaction)).rejects.toThrow("Phantom provider not found.");
  });

  it("should throw error if provider does not support method", async () => {
    mockDefaultGetProvider.mockReturnValue({ isConnected: true } as PhantomSolanaProvider);
    await expect(signAndSendTransaction(mockTransaction)).rejects.toThrow(
      "The connected provider does not support signAndSendTransaction.",
    );
  });

  it("should call connect if provider is not initially connected, then proceed", async () => {
    const expectedResult = { signature: "mockSig", publicKey: "mockKey" };
    mockProvider.isConnected = false;
    mockConnect.mockImplementation(async () => {
      // Simulate connect updating the provider's state
      const provider = defaultGetProvider() as PhantomSolanaProvider | null;
      if (provider) provider.isConnected = true;
      return Promise.resolve("somePublicKey");
    });
    (mockProvider.signAndSendTransaction as jest.Mock).mockResolvedValue(expectedResult);
    mockDefaultGetProvider.mockReturnValue(mockProvider as PhantomSolanaProvider);

    const result = await signAndSendTransaction(mockTransaction);

    expect(mockDefaultGetProvider).toHaveBeenCalledTimes(2); // Called once in main func, once in mockConnect
    expect(mockConnect).toHaveBeenCalledTimes(1);
    expect(mockConnect).toHaveBeenCalledWith();
    expect(mockProvider.signAndSendTransaction).toHaveBeenCalledWith(mockTransaction);
    expect(result).toEqual(expectedResult);
    expect(mockProvider.isConnected).toBe(true);
  });

  it("should throw error if connect fails when provider is not initially connected", async () => {
    mockProvider.isConnected = false;
    mockConnect.mockRejectedValue(new Error("Failed to connect"));
    mockDefaultGetProvider.mockReturnValue(mockProvider as PhantomSolanaProvider);

    await expect(signAndSendTransaction(mockTransaction)).rejects.toThrow("Failed to connect");
    expect(mockConnect).toHaveBeenCalledTimes(1);
    expect(mockProvider.signAndSendTransaction).not.toHaveBeenCalled();
  });

  it("should throw error if provider is still not connected after connect attempt", async () => {
    mockProvider.isConnected = false;
    mockConnect.mockImplementation(async () => {
      const provider = defaultGetProvider() as PhantomSolanaProvider | null;
      if (provider) provider.isConnected = false;
      return Promise.resolve("somePublicKey");
    });
    mockDefaultGetProvider.mockReturnValue(mockProvider as PhantomSolanaProvider);

    await expect(signAndSendTransaction(mockTransaction)).rejects.toThrow(
      "Provider is not connected even after attempting to connect.",
    );
    expect(mockConnect).toHaveBeenCalledTimes(1);
    expect(mockProvider.signAndSendTransaction).not.toHaveBeenCalled();
  });
});
