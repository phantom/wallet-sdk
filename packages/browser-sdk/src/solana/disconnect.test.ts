import { disconnect } from "./disconnect";
import { getProvider as defaultGetProvider } from "./getProvider";
import type { PhantomSolanaProvider } from "./types";

jest.mock("./getProvider", () => ({
  getProvider: jest.fn(),
}));

const mockDefaultGetProvider = defaultGetProvider as jest.MockedFunction<() => PhantomSolanaProvider | null>;

describe("disconnect", () => {
  let mockProvider: Partial<PhantomSolanaProvider>;

  beforeEach(() => {
    jest.clearAllMocks();
    mockDefaultGetProvider.mockReset();
    mockProvider = {
      disconnect: jest.fn(),
    };
    mockDefaultGetProvider.mockReturnValue(mockProvider as PhantomSolanaProvider);
  });

  it("should call disconnect on the provider", async () => {
    await disconnect();
    expect(mockDefaultGetProvider).toHaveBeenCalledTimes(1);
    expect(mockProvider.disconnect).toHaveBeenCalledTimes(1);
  });

  it("should throw error when provider is not properly injected", async () => {
    mockDefaultGetProvider.mockReturnValue(null);

    await expect(disconnect()).rejects.toThrow("Phantom provider not found.");
    expect(mockDefaultGetProvider).toHaveBeenCalledTimes(1);
  });
});
