import { autoConfirmEnable } from "./autoConfirmEnable";
import { getProvider } from "./getProvider";
import type { PhantomProvider } from "./types";
import { NetworkId } from "@phantom/constants";

jest.mock("./getProvider", () => ({
  getProvider: jest.fn(),
}));

const mockGetProvider = getProvider as jest.MockedFunction<() => PhantomProvider | null>;

describe("autoConfirmEnable", () => {
  let mockProvider: Partial<PhantomProvider>;

  beforeEach(() => {
    jest.clearAllMocks();
    mockProvider = {
      request: jest.fn(),
    };
    mockGetProvider.mockReturnValue(mockProvider as PhantomProvider);
  });

  it("should enable auto-confirm with chains parameter", async () => {
    const mockProviderResponse = { enabled: true, chains: ["solana:103", "eip155:1"] };
    const expectedResult = { enabled: true, chains: [NetworkId.SOLANA_DEVNET, NetworkId.ETHEREUM_MAINNET] };
    (mockProvider.request as jest.Mock).mockResolvedValue(mockProviderResponse);

    const result = await autoConfirmEnable({ chains: [NetworkId.SOLANA_DEVNET, NetworkId.ETHEREUM_MAINNET] });

    expect(mockGetProvider).toHaveBeenCalledTimes(1);
    expect(mockProvider.request).toHaveBeenCalledWith({
      method: "phantom_auto_confirm_enable",
      params: { chains: ["solana:103", "eip155:1"] },
    });
    expect(result).toEqual(expectedResult);
  });

  it("should enable auto-confirm without chains parameter", async () => {
    const mockResult = { enabled: true, chains: [] };
    (mockProvider.request as jest.Mock).mockResolvedValue(mockResult);

    const result = await autoConfirmEnable();

    expect(mockGetProvider).toHaveBeenCalledTimes(1);
    expect(mockProvider.request).toHaveBeenCalledWith({
      method: "phantom_auto_confirm_enable",
      params: {},
    });
    expect(result).toEqual(mockResult);
  });

  it("should throw error when provider is not found", async () => {
    mockGetProvider.mockReturnValue(null);

    await expect(autoConfirmEnable()).rejects.toThrow("Provider not found.");
    expect(mockGetProvider).toHaveBeenCalledTimes(1);
  });

  it("should handle provider request error", async () => {
    (mockProvider.request as jest.Mock).mockRejectedValue(new Error("Request failed"));

    await expect(autoConfirmEnable()).rejects.toThrow("Request failed");
    expect(mockGetProvider).toHaveBeenCalledTimes(1);
    expect(mockProvider.request).toHaveBeenCalledTimes(1);
  });
});
