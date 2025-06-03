import type { SolanaAdapter } from "./adapters/types";
import { getAdapter } from "./getAdapter";
import { signMessage } from "./signMessage";
import type { DisplayEncoding, PhantomSolanaProvider } from "./types";

jest.mock("./getAdapter", () => ({
  getAdapter: jest.fn(),
}));

describe("signMessage", () => {
  let mockAdapter: Partial<PhantomSolanaProvider>;

  beforeEach(() => {
    jest.clearAllMocks();
    mockAdapter = {
      signMessage: jest.fn(),
      isConnected: true,
      connect: jest.fn(),
    };
    (getAdapter as jest.Mock).mockReturnValue(mockAdapter as unknown as SolanaAdapter);
  });

  it("should properly call signMessage on the adapter", async () => {
    const message = new Uint8Array([1, 2, 3]);
    const display: DisplayEncoding = "hex";
    const expectedSignature = new Uint8Array([4, 5, 6]);
    const expectedResult = { signature: expectedSignature, address: "123" };
    (mockAdapter.signMessage as jest.Mock).mockResolvedValue({
      signature: expectedSignature,
      address: "123",
    });

    const result = await signMessage(message, display);

    expect(getAdapter).toHaveBeenCalledTimes(1);
    expect(mockAdapter.signMessage).toHaveBeenCalledWith(message, display);
    expect(result).toEqual(expectedResult);
  });

  it("should throw an error if adapter is not found", async () => {
    (getAdapter as jest.Mock).mockReturnValue(null);
    const message = new Uint8Array([1, 2, 3]);
    await expect(signMessage(message)).rejects.toThrow("Adapter not found.");
  });

  it("should call connect if adapter is not initially connected, then proceed with signMessage", async () => {
    const message = new Uint8Array([1, 2, 3]);
    const display: DisplayEncoding = "hex";
    const expectedSignature = new Uint8Array([4, 5, 6]);
    const expectedResult = { signature: expectedSignature, address: "123" };

    mockAdapter.isConnected = false;
    (mockAdapter.signMessage as jest.Mock).mockResolvedValue({
      signature: expectedSignature,
      address: "123",
    });

    const result = await signMessage(message, display);

    expect(getAdapter).toHaveBeenCalledTimes(1);
    expect(mockAdapter.signMessage).toHaveBeenCalledWith(message, display);
    expect(mockAdapter.connect).toHaveBeenCalledTimes(1);
    expect(result).toEqual(expectedResult);
  });

  it("should use default display encoding if not provided", async () => {
    const message = new Uint8Array([1, 2, 3]);
    const expectedSignature = new Uint8Array([10, 11, 12]);
    const expectedResult = { signature: expectedSignature, address: "123" };
    (mockAdapter.signMessage as jest.Mock).mockResolvedValue({
      signature: expectedSignature,
      address: "123",
    });
    mockAdapter.isConnected = true;
    (getAdapter as jest.Mock).mockReturnValue(mockAdapter as unknown as SolanaAdapter);

    const result = await signMessage(message);

    expect(mockAdapter.signMessage).toHaveBeenCalledWith(message, undefined);
    expect(result).toEqual(expectedResult);
  });
});
