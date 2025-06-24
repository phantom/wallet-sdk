import { autoConfirmStatus } from "./autoConfirmStatus";
import { getProvider } from "./getProvider";
import type { PhantomProvider } from "./types";

jest.mock("./getProvider", () => ({
  getProvider: jest.fn(),
}));

const mockGetProvider = getProvider as jest.MockedFunction<() => Promise<PhantomProvider | null>>;

describe("autoConfirmStatus", () => {
  let mockProvider: Partial<PhantomProvider>;

  beforeEach(() => {
    jest.clearAllMocks();
    mockProvider = {
      request: jest.fn(),
    };
    mockGetProvider.mockReturnValue(Promise.resolve(mockProvider as PhantomProvider));
  });

  it("should get auto-confirm status", async () => {
    const mockResult = { enabled: true, chains: ["solana:101", "eip155:1"] };
    (mockProvider.request as jest.Mock).mockResolvedValue(mockResult);

    const result = await autoConfirmStatus();

    expect(mockGetProvider).toHaveBeenCalledTimes(1);
    expect(mockProvider.request).toHaveBeenCalledWith({
      method: "phantom_auto_confirm_status",
      params: {},
    });
    expect(result).toEqual(mockResult);
  });

  it("should throw error when provider is not found", async () => {
    mockGetProvider.mockReturnValue(Promise.resolve(null));

    await expect(autoConfirmStatus()).rejects.toThrow("Phantom provider not found.");
    expect(mockGetProvider).toHaveBeenCalledTimes(1);
  });

  it("should handle provider request error", async () => {
    (mockProvider.request as jest.Mock).mockRejectedValue(new Error("Request failed"));

    await expect(autoConfirmStatus()).rejects.toThrow("Request failed");
    expect(mockGetProvider).toHaveBeenCalledTimes(1);
    expect(mockProvider.request).toHaveBeenCalledTimes(1);
  });
});
