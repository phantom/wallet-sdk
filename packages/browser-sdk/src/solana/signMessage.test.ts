import type { SolanaStrategy } from "./strategies/types";
import { getProvider } from "./getProvider";
import { signMessage } from "./signMessage";
import type { DisplayEncoding, PhantomSolanaProvider } from "./types";

jest.mock("./getProvider", () => ({
  getProvider: jest.fn(),
}));

describe("signMessage", () => {
  let mockProvider: Partial<PhantomSolanaProvider>;

  beforeEach(() => {
    jest.clearAllMocks();
    mockProvider = {
      signMessage: jest.fn(),
      isConnected: true,
      connect: jest.fn(),
    };
    (getProvider as jest.Mock).mockReturnValue(mockProvider as unknown as SolanaStrategy);
  });

  it("should properly call signMessage on the provider", async () => {
    const message = new Uint8Array([1, 2, 3]);
    const display: DisplayEncoding = "hex";
    const expectedSignature = new Uint8Array([4, 5, 6]);
    const expectedResult = { signature: expectedSignature, address: "123" };
    (mockProvider.signMessage as jest.Mock).mockResolvedValue({
      signature: expectedSignature,
      address: "123",
    });

    const result = await signMessage(message, display);

    expect(getProvider).toHaveBeenCalledTimes(1);
    expect(mockProvider.signMessage).toHaveBeenCalledWith(message, display);
    expect(result).toEqual(expectedResult);
  });

  it("should throw an error if provider is not found", async () => {
    (getProvider as jest.Mock).mockReturnValue(null);
    const message = new Uint8Array([1, 2, 3]);
    await expect(signMessage(message)).rejects.toThrow("Provider not found.");
  });

  it("should call connect if provider is not initially connected, then proceed with signMessage", async () => {
    const message = new Uint8Array([1, 2, 3]);
    const display: DisplayEncoding = "hex";
    const expectedSignature = new Uint8Array([4, 5, 6]);
    const expectedResult = { signature: expectedSignature, address: "123" };

    mockProvider.isConnected = false;
    (mockProvider.signMessage as jest.Mock).mockResolvedValue({
      signature: expectedSignature,
      address: "123",
    });

    const result = await signMessage(message, display);

    expect(getProvider).toHaveBeenCalledTimes(1);
    expect(mockProvider.signMessage).toHaveBeenCalledWith(message, display);
    expect(mockProvider.connect).toHaveBeenCalledTimes(1);
    expect(result).toEqual(expectedResult);
  });

  it("should use default display encoding if not provided", async () => {
    const message = new Uint8Array([1, 2, 3]);
    const expectedSignature = new Uint8Array([10, 11, 12]);
    const expectedResult = { signature: expectedSignature, address: "123" };
    (mockProvider.signMessage as jest.Mock).mockResolvedValue({
      signature: expectedSignature,
      address: "123",
    });
    mockProvider.isConnected = true;
    (getProvider as jest.Mock).mockReturnValue(mockProvider as unknown as SolanaStrategy);

    const result = await signMessage(message);

    expect(mockProvider.signMessage).toHaveBeenCalledWith(message, undefined);
    expect(result).toEqual(expectedResult);
  });
});
