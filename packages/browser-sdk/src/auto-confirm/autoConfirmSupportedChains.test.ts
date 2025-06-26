import { autoConfirmSupportedChains } from "./autoConfirmSupportedChains";
import { getProvider } from "./getProvider";
import type { PhantomProvider } from "./types";

jest.mock("./getProvider", () => ({
  getProvider: jest.fn(),
}));

const mockGetProvider = getProvider as jest.MockedFunction<() => PhantomProvider | null>;

describe("autoConfirmSupportedChains", () => {
  let mockProvider: Partial<PhantomProvider>;

  beforeEach(() => {
    jest.clearAllMocks();
    mockProvider = {
      request: jest.fn(),
    };
    mockGetProvider.mockReturnValue(mockProvider as PhantomProvider);
  });

  it("should get supported chains", async () => {
    const mockResult = { chains: ["solana:101", "eip155:1", "sui:mainnet"] };
    (mockProvider.request as jest.Mock).mockResolvedValue(mockResult);

    const result = await autoConfirmSupportedChains();

    expect(mockGetProvider).toHaveBeenCalledTimes(1);
    expect(mockProvider.request).toHaveBeenCalledWith({
      method: "phantom_auto_confirm_supported_chains",
      params: {},
    });
    expect(result).toEqual(mockResult);
  });

  it("should throw error when provider is not found", async () => {
    mockGetProvider.mockReturnValue(null);

    await expect(autoConfirmSupportedChains()).rejects.toThrow("Provider not found.");
    expect(mockGetProvider).toHaveBeenCalledTimes(1);
  });

  it("should handle provider request error", async () => {
    (mockProvider.request as jest.Mock).mockRejectedValue(new Error("Request failed"));

    await expect(autoConfirmSupportedChains()).rejects.toThrow("Request failed");
    expect(mockGetProvider).toHaveBeenCalledTimes(1);
    expect(mockProvider.request).toHaveBeenCalledTimes(1);
  });
});
