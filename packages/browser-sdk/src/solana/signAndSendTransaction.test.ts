import { signAndSendTransaction } from "./signAndSendTransaction";
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
    mockConnect.mockReset(); // Reset connect mock
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
    expect(customProvider.signAndSendTransaction).toHaveBeenCalledWith(mockVersionedTransaction);
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

  it("should call connect if provider is not initially connected, then proceed", async () => {
    const expectedResult = { signature: "mockSig", publicKey: "mockKey" };
    // Provider initially not connected
    mockProvider.isConnected = false;
    // Mock connect to simulate successful connection and update isConnected status
    mockConnect.mockImplementation(() => {
      // Simulate that connect updates the provider's state
      // In a real scenario, connect would interact with the provider instance
      // For testing, we can update the mockProvider's isConnected state here
      // or ensure the provider instance connect works on is the same one being checked.
      // The key is that after connect resolves, isConnected should be true.
      (mockDefaultGetProvider() as PhantomSolanaProvider).isConnected = true;
      return Promise.resolve("somePublicKey"); // connect resolves with a public key string
    });
    (mockProvider.signAndSendTransaction as jest.Mock).mockResolvedValue(expectedResult);
    mockDefaultGetProvider.mockReturnValue(mockProvider as PhantomSolanaProvider);

    const result = await signAndSendTransaction(mockTransaction);

    expect(mockDefaultGetProvider).toHaveBeenCalledTimes(1); // Called once to get provider initially
    expect(mockConnect).toHaveBeenCalledTimes(1); // connect should be called
    // Ensure connect was called with the correct getProvider function
    expect(mockConnect).toHaveBeenCalledWith({ getProvider: defaultGetProvider });
    expect(mockProvider.signAndSendTransaction).toHaveBeenCalledWith(mockTransaction);
    expect(result).toEqual(expectedResult);
    // Ensure the provider is now connected
    expect(mockProvider.isConnected).toBe(true);
  });

  it("should throw error if connect fails when provider is not initially connected", async () => {
    mockProvider.isConnected = false;
    mockConnect.mockRejectedValue(new Error("Failed to connect")); // Simulate connect failing
    mockDefaultGetProvider.mockReturnValue(mockProvider as PhantomSolanaProvider);

    await expect(signAndSendTransaction(mockTransaction)).rejects.toThrow("Failed to connect");
    expect(mockConnect).toHaveBeenCalledTimes(1);
    expect(mockProvider.signAndSendTransaction).not.toHaveBeenCalled();
  });

  it("should throw error if provider is still not connected after connect attempt (e.g. connect resolves but isConnected is false)", async () => {
    mockProvider.isConnected = false;
    // Simulate connect resolving but isConnected somehow remaining false
    // This tests the final check for isConnected in signAndSendTransaction
    mockConnect.mockImplementation(() => {
      // Simulate connect "succeeding" but not actually connecting
      // This is a specific scenario to test the final guard in signAndSendTransaction
      (mockDefaultGetProvider() as PhantomSolanaProvider).isConnected = false;
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
