import { disconnect } from "./disconnect";
import { getProvider as defaultGetProvider } from "./getProvider";
import type { PhantomSolanaProvider, SolanaOperationOptions } from "./types";

jest.mock("./getProvider", () => ({
  getProvider: jest.fn(),
}));

const mockDefaultGetProvider = defaultGetProvider as jest.MockedFunction<() => PhantomSolanaProvider | null>;

describe("disconnect", () => {
  let mockProvider: Partial<PhantomSolanaProvider>;
  let customMockGetProvider: jest.MockedFunction<() => PhantomSolanaProvider | null>;

  beforeEach(() => {
    jest.clearAllMocks();
    mockDefaultGetProvider.mockReset();
    customMockGetProvider = jest.fn();
    mockProvider = {
      disconnect: jest.fn(),
    };
    mockDefaultGetProvider.mockReturnValue(mockProvider as PhantomSolanaProvider);
  });

  it("should call disconnect on the provider using default getProvider", async () => {
    await disconnect();
    expect(mockDefaultGetProvider).toHaveBeenCalledTimes(1);
    expect(customMockGetProvider).not.toHaveBeenCalled();
    expect(mockProvider.disconnect).toHaveBeenCalledTimes(1);
  });

  it("should call disconnect on the provider using custom getProvider", async () => {
    const customProvider = { ...mockProvider };
    customMockGetProvider.mockReturnValue(customProvider as PhantomSolanaProvider);
    const operationOptions: SolanaOperationOptions = { getProvider: customMockGetProvider };

    await disconnect(operationOptions);
    expect(customMockGetProvider).toHaveBeenCalledTimes(1);
    expect(mockDefaultGetProvider).not.toHaveBeenCalled();
    expect(customProvider.disconnect).toHaveBeenCalledTimes(1);
  });

  it("should throw error when provider is not properly injected (default getProvider)", async () => {
    mockDefaultGetProvider.mockReturnValue(null);

    await expect(disconnect()).rejects.toThrow("Phantom provider not found.");
    expect(mockDefaultGetProvider).toHaveBeenCalledTimes(1);
  });

  it("should throw error when provider is not properly injected (custom getProvider)", async () => {
    customMockGetProvider.mockReturnValue(null);
    const operationOptions: SolanaOperationOptions = { getProvider: customMockGetProvider };

    await expect(disconnect(operationOptions)).rejects.toThrow("Phantom provider not found.");
    expect(customMockGetProvider).toHaveBeenCalledTimes(1);
    expect(mockDefaultGetProvider).not.toHaveBeenCalled();
  });
});
