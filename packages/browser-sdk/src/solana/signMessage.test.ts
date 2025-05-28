import { signMessage } from "./signMessage";
import { getProvider as defaultGetProvider } from "./getProvider";
import type { PhantomSolanaProvider, DisplayEncoding } from "./types";
import type { PublicKey } from "@solana/web3.js";
import { connect } from "./connect";

// Mock defaultGetProvider
jest.mock("./getProvider", () => ({
  getProvider: jest.fn(),
}));
jest.mock("./connect", () => ({
  connect: jest.fn(),
}));

const mockDefaultGetProvider = defaultGetProvider as jest.MockedFunction<() => PhantomSolanaProvider | null>;
const mockConnect = connect as jest.MockedFunction<typeof connect>;

const mockPublicKey = { toBase58: () => "mockPublicKey" } as unknown as PublicKey;

describe("signMessage", () => {
  let mockProvider: Partial<PhantomSolanaProvider>;

  beforeEach(() => {
    mockDefaultGetProvider.mockReset();
    mockConnect.mockReset();
    mockProvider = {
      signMessage: jest.fn(),
      isConnected: true,
    };
    mockDefaultGetProvider.mockReturnValue(mockProvider as PhantomSolanaProvider);
  });

  it("should use default getProvider and call provider.signMessage", async () => {
    const message = new Uint8Array([1, 2, 3]);
    const display: DisplayEncoding = "hex";
    const expectedSignature = new Uint8Array([4, 5, 6]);
    const expectedResult = { signature: expectedSignature, publicKey: mockPublicKey };
    (mockProvider.signMessage as jest.Mock).mockResolvedValue(expectedResult);

    const result = await signMessage(message, display);

    expect(mockDefaultGetProvider).toHaveBeenCalledTimes(1);
    expect(mockProvider.signMessage).toHaveBeenCalledWith(message, display);
    expect(result).toEqual(expectedResult);
  });

  it("should throw an error if provider is not found", async () => {
    mockDefaultGetProvider.mockReturnValue(null);
    const message = new Uint8Array([1, 2, 3]);
    await expect(signMessage(message)).rejects.toThrow("Phantom provider not found.");
  });

  it("should throw an error if provider does not support signMessage", async () => {
    mockDefaultGetProvider.mockReturnValue({ isConnected: true } as PhantomSolanaProvider);
    const message = new Uint8Array([1, 2, 3]);
    await expect(signMessage(message)).rejects.toThrow("The connected provider does not support signMessage.");
  });

  it("should call connect if provider is not initially connected, then proceed with signMessage", async () => {
    const message = new Uint8Array([1, 2, 3]);
    const display: DisplayEncoding = "hex";
    const expectedSignature = new Uint8Array([4, 5, 6]);
    const expectedResult = { signature: expectedSignature, publicKey: mockPublicKey };

    mockProvider.isConnected = false;

    mockConnect.mockImplementation(async () => {
      const providerFromGetProvider = defaultGetProvider() as PhantomSolanaProvider | null;
      if (providerFromGetProvider) {
        providerFromGetProvider.isConnected = true;
      }
      return Promise.resolve("mockPublicKeyString");
    });

    (mockProvider.signMessage as jest.Mock).mockResolvedValue(expectedResult);

    const result = await signMessage(message, display);

    expect(mockDefaultGetProvider).toHaveBeenCalledTimes(2);
    expect(mockConnect).toHaveBeenCalledTimes(1);
    expect(mockConnect).toHaveBeenCalledWith();
    expect(mockProvider.isConnected).toBe(true);
    expect(mockProvider.signMessage).toHaveBeenCalledWith(message, display);
    expect(result).toEqual(expectedResult);
  });

  it("should throw error if connect fails when provider is not initially connected", async () => {
    const message = new Uint8Array([1, 2, 3]);
    mockProvider.isConnected = false;

    mockConnect.mockRejectedValue(new Error("ConnectionFailedError"));

    await expect(signMessage(message)).rejects.toThrow("ConnectionFailedError");
    expect(mockConnect).toHaveBeenCalledTimes(1);
    expect(mockProvider.signMessage).not.toHaveBeenCalled();
  });

  it("should throw error if provider is still not connected after connect attempt", async () => {
    const message = new Uint8Array([1, 2, 3]);
    mockProvider.isConnected = false;

    mockConnect.mockImplementation(async () => {
      const providerFromGetProvider = defaultGetProvider() as PhantomSolanaProvider | null;
      if (providerFromGetProvider) {
        providerFromGetProvider.isConnected = false;
      }
      return Promise.resolve("mockPublicKeyString");
    });

    await expect(signMessage(message)).rejects.toThrow("Provider is not connected even after attempting to connect.");
    expect(mockConnect).toHaveBeenCalledTimes(1);
    expect(mockProvider.signMessage).not.toHaveBeenCalled();
  });

  it("should use default display encoding if not provided", async () => {
    const message = new Uint8Array([1, 2, 3]);
    const expectedSignature = new Uint8Array([10, 11, 12]);
    const expectedResult = { signature: expectedSignature, publicKey: mockPublicKey };
    (mockProvider.signMessage as jest.Mock).mockResolvedValue(expectedResult);
    mockProvider.isConnected = true;
    mockDefaultGetProvider.mockReturnValue(mockProvider as PhantomSolanaProvider);

    await signMessage(message);

    expect(mockProvider.signMessage).toHaveBeenCalledWith(message, undefined);
  });
});
