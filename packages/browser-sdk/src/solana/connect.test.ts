import { connect } from "./connect";
import { getProvider as defaultGetProvider } from "./getProvider";
import type { PhantomSolanaProvider } from "./types";

jest.mock("./getProvider", () => ({
  getProvider: jest.fn(),
}));

const mockDefaultGetProvider = defaultGetProvider as jest.MockedFunction<() => PhantomSolanaProvider | null>;

describe("connect", () => {
  let mockProvider: Partial<PhantomSolanaProvider>;

  beforeEach(() => {
    jest.clearAllMocks();
    mockDefaultGetProvider.mockReset();
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
  it("should perform regular non-eager connect when app is not trusted", async () => {
    const publicKey = await connect();

    expect(mockDefaultGetProvider).toHaveBeenCalledTimes(1);
    expect(mockProvider.connect).toHaveBeenCalledTimes(2);
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
  it("should throw error when provider is not properly injected", async () => {
    mockDefaultGetProvider.mockReturnValue(null);
    await expect(connect()).rejects.toThrow("Phantom provider not found.");
    expect(mockDefaultGetProvider).toHaveBeenCalledTimes(1);
  });
});
