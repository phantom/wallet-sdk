import { connect } from "./connect";
import { getProvider as defaultGetProvider } from "./getProvider";
import type { PhantomSolanaProvider, SolanaOperationOptions } from "./types";

jest.mock("./getProvider", () => ({
  getProvider: jest.fn(),
}));

const mockDefaultGetProvider = defaultGetProvider as jest.MockedFunction<() => PhantomSolanaProvider | null>;

describe("connect", () => {
  let mockProvider: Partial<PhantomSolanaProvider>;
  let customMockGetProvider: jest.MockedFunction<() => PhantomSolanaProvider | null>;

  beforeEach(() => {
    jest.clearAllMocks();
    mockDefaultGetProvider.mockReset();
    customMockGetProvider = jest.fn();
    mockProvider = {
      connect: jest.fn().mockImplementation(({ onlyIfTrusted }) => {
        if (onlyIfTrusted) {
          throw new Error("Not trusted");
        }
        return { publicKey: { toString: () => "123" } as any };
      }),
      isConnected: false,
      publicKey: { toString: () => "123" } as any,
    };
    mockDefaultGetProvider.mockReturnValue(mockProvider as PhantomSolanaProvider);
  });
  it("should perform regular non-eager connect when app is not trusted using default getProvider", async () => {
    const publicKey = await connect();

    expect(mockDefaultGetProvider).toHaveBeenCalledTimes(1);
    expect(customMockGetProvider).not.toHaveBeenCalled();
    expect(mockProvider.connect).toHaveBeenCalledTimes(2);
    expect(publicKey).toBeDefined();
  });

  it("should perform regular non-eager connect when app is not trusted using custom getProvider", async () => {
    const customProvider = { ...mockProvider };
    customMockGetProvider.mockReturnValue(customProvider as PhantomSolanaProvider);
    const operationOptions: SolanaOperationOptions = { getProvider: customMockGetProvider };

    const publicKey = await connect(operationOptions);

    expect(customMockGetProvider).toHaveBeenCalledTimes(1);
    expect(mockDefaultGetProvider).not.toHaveBeenCalled();
    expect(customProvider.connect).toHaveBeenCalledTimes(2);
    expect(publicKey).toBeDefined();
  });

  it("should perform eager connect when app is already trusted", async () => {
    (mockProvider.connect as jest.Mock).mockImplementation(() => ({
      publicKey: { toString: () => "123" } as any,
    }));
    const publicKey = await connect();
    expect(mockDefaultGetProvider).toHaveBeenCalledTimes(1);
    expect(publicKey).toBeDefined();
  });

  it("should return public key immediately when app is already connected", async () => {
    mockProvider.isConnected = true;
    const publicKey = await connect();
    expect(mockDefaultGetProvider).toHaveBeenCalledTimes(1);
    expect(publicKey).toBeDefined();
    expect(mockProvider.connect).not.toHaveBeenCalled();
  });
  it("should throw error when connect fails", async () => {
    mockProvider.isConnected = false;
    (mockProvider.connect as jest.Mock).mockImplementation(() => {
      throw new Error("Failed to connect");
    });
    await expect(connect()).rejects.toThrow("Failed to connect to Phantom.");
    expect(mockDefaultGetProvider).toHaveBeenCalledTimes(1);
  });
  it("should throw error when provider is not properly injected (default getProvider)", async () => {
    mockDefaultGetProvider.mockReturnValue(null);
    await expect(connect()).rejects.toThrow("Phantom provider not found.");
    expect(mockDefaultGetProvider).toHaveBeenCalledTimes(1);
  });

  it("should throw error when provider is not properly injected (custom getProvider)", async () => {
    customMockGetProvider.mockReturnValue(null);
    const operationOptions: SolanaOperationOptions = { getProvider: customMockGetProvider };
    await expect(connect(operationOptions)).rejects.toThrow("Phantom provider not found.");
    expect(customMockGetProvider).toHaveBeenCalledTimes(1);
    expect(mockDefaultGetProvider).not.toHaveBeenCalled();
  });
});
