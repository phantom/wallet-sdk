import { autoConfirmDisable } from "./autoConfirmDisable";
import { getProvider } from "./getProvider";
import type { AutoConfirmResult, PhantomProvider } from "./types";

jest.mock("./getProvider", () => ({
  getProvider: jest.fn(),
}));

const mockGetProvider = getProvider as jest.MockedFunction<() => PhantomProvider | null>;

describe("autoConfirmDisable", () => {
  let mockProvider: Partial<PhantomProvider>;

  beforeEach(() => {
    jest.clearAllMocks();
    mockProvider = {
      request: jest.fn(),
    };
    mockGetProvider.mockReturnValue(mockProvider as PhantomProvider);
  });

  it("should disable auto-confirm", async () => {
    const mockResult: AutoConfirmResult = { enabled: false, chains: [] };
    (mockProvider.request as jest.Mock).mockImplementation(({ method }) => {
      if (method === "phantom_auto_confirm_disable") {
        return Promise.resolve(mockResult);
      }
      throw new Error(`Unknown ${method}`);
    });

    const result = await autoConfirmDisable();

    expect(mockGetProvider).toHaveBeenCalledTimes(1);
    expect(mockProvider.request).toHaveBeenCalledWith({
      method: "phantom_auto_confirm_disable",
      params: {},
    });
    expect(result).toEqual(mockResult);
  });

  it("should throw error when provider is not found", async () => {
    mockGetProvider.mockReturnValue(null);

    await expect(autoConfirmDisable()).rejects.toThrow("Provider not found.");
    expect(mockGetProvider).toHaveBeenCalledTimes(1);
  });

  it("should handle provider request error", async () => {
    (mockProvider.request as jest.Mock).mockRejectedValue(new Error("Request failed"));

    await expect(autoConfirmDisable()).rejects.toThrow("Request failed");
    expect(mockGetProvider).toHaveBeenCalledTimes(1);
    expect(mockProvider.request).toHaveBeenCalledTimes(1);
  });
});
