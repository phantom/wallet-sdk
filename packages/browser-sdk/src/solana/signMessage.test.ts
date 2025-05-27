import { signMessage } from "./signMessage";
import { getProvider as defaultGetProvider } from "./getProvider";
import type { PhantomSolanaProvider, DisplayEncoding, SolanaOperationOptions } from "./types";
import type { PublicKey } from "@solana/web3.js";

// Mock defaultGetProvider
jest.mock("./getProvider", () => ({
  getProvider: jest.fn(),
}));
const mockDefaultGetProvider = defaultGetProvider as jest.MockedFunction<() => PhantomSolanaProvider | null>;

const mockPublicKey = { toBase58: () => "mockPublicKey" } as unknown as PublicKey;

describe("signMessage", () => {
  let mockProvider: Partial<PhantomSolanaProvider>;
  let customMockGetProvider: jest.MockedFunction<() => PhantomSolanaProvider | null>;

  beforeEach(() => {
    mockDefaultGetProvider.mockReset();
    customMockGetProvider = jest.fn();
    mockProvider = {
      signMessage: jest.fn(),
      isConnected: true,
    };
    // Default behavior: defaultGetProvider returns the mockProvider
    mockDefaultGetProvider.mockReturnValue(mockProvider as PhantomSolanaProvider);
  });

  it("should use default getProvider and call provider.signMessage", async () => {
    const message = new Uint8Array([1, 2, 3]);
    const display: DisplayEncoding = "hex";
    const expectedSignature = new Uint8Array([4, 5, 6]);
    const expectedResult = { signature: expectedSignature, publicKey: mockPublicKey };
    (mockProvider.signMessage as jest.Mock).mockResolvedValue(expectedResult);

    const result = await signMessage(message, display); // No options passed

    expect(mockDefaultGetProvider).toHaveBeenCalledTimes(1);
    expect(customMockGetProvider).not.toHaveBeenCalled();
    expect(mockProvider.signMessage).toHaveBeenCalledWith(message, display);
    expect(result).toEqual(expectedResult);
  });

  it("should use custom getProvider from options and call provider.signMessage", async () => {
    const message = new Uint8Array([1, 2, 3]);
    const display: DisplayEncoding = "hex";
    const expectedSignature = new Uint8Array([7, 8, 9]);
    const expectedResult = { signature: expectedSignature, publicKey: mockPublicKey };

    const customProvider = { ...mockProvider, signMessage: jest.fn().mockResolvedValue(expectedResult) };
    customMockGetProvider.mockReturnValue(customProvider as PhantomSolanaProvider);
    (mockProvider.signMessage as jest.Mock).mockResolvedValue(expectedResult); // Not used but set for safety

    const options: SolanaOperationOptions = { getProvider: customMockGetProvider };
    const result = await signMessage(message, display, options);

    expect(customMockGetProvider).toHaveBeenCalledTimes(1);
    expect(mockDefaultGetProvider).not.toHaveBeenCalled();
    expect(customProvider.signMessage).toHaveBeenCalledWith(message, display);
    expect(result).toEqual(expectedResult);
  });

  it("should throw an error if provider is not found (default getProvider)", async () => {
    mockDefaultGetProvider.mockReturnValue(null);
    const message = new Uint8Array([1, 2, 3]);
    await expect(signMessage(message)).rejects.toThrow("Phantom provider not found.");
  });

  it("should throw an error if provider is not found (custom getProvider)", async () => {
    customMockGetProvider.mockReturnValue(null);
    const message = new Uint8Array([1, 2, 3]);
    const options: SolanaOperationOptions = { getProvider: customMockGetProvider };
    await expect(signMessage(message, "utf8", options)).rejects.toThrow("Phantom provider not found.");
  });

  it("should throw an error if provider does not support signMessage", async () => {
    mockDefaultGetProvider.mockReturnValue({ isConnected: true } as PhantomSolanaProvider); // Provider exists, is connected, but no signMessage
    const message = new Uint8Array([1, 2, 3]);
    await expect(signMessage(message)).rejects.toThrow("The connected provider does not support signMessage.");
  });

  it("should throw an error if provider is not connected", async () => {
    mockDefaultGetProvider.mockReturnValue({ ...mockProvider, isConnected: false } as PhantomSolanaProvider);
    const message = new Uint8Array([1, 2, 3]);
    await expect(signMessage(message)).rejects.toThrow("Provider is not connected.");
  });

  it("should use default display encoding if not provided", async () => {
    const message = new Uint8Array([1, 2, 3]);
    const expectedSignature = new Uint8Array([10, 11, 12]);
    const expectedResult = { signature: expectedSignature, publicKey: mockPublicKey };
    (mockProvider.signMessage as jest.Mock).mockResolvedValue(expectedResult);

    await signMessage(message); // display and options are undefined

    expect(mockProvider.signMessage).toHaveBeenCalledWith(message, undefined);
  });
});
