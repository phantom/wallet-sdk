import { getAccount } from "./getAccount";
import type { PhantomSolanaProvider } from "./types";
import { getProvider } from "./getProvider";

jest.mock("./getProvider", () => ({
  getProvider: jest.fn(),
}));

describe("getAccount", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("should return connected status with public key when provider is connected", () => {
    const mockPublicKey = {
      toString: () => "11111111111111111111111111111112",
    };
    const mockProvider = {
      isConnected: true,
      publicKey: mockPublicKey,
    };
    (getProvider as jest.Mock).mockReturnValue(mockProvider);

    const result = getAccount();

    expect(result).toEqual({
      status: "connected",
      address: mockPublicKey.toString(),
    });
  });

  it("should return disconnected status when provider exists but is not connected", () => {
    const mockProvider: Partial<PhantomSolanaProvider> = {
      isConnected: false,
      publicKey: null,
    };
    (getProvider as jest.Mock).mockReturnValue(mockProvider);

    const result = getAccount();

    expect(result).toEqual({
      status: "disconnected",
      address: null,
    });
  });

  it("should return disconnected status when provider cannot be retrieved", () => {
    (getProvider as jest.Mock).mockReturnValue(null);

    const result = getAccount();

    expect(result).toEqual({
      status: "disconnected",
      address: null,
    });
  });

  it("should return disconnected status when provider is connected but has no public key", () => {
    const mockProvider: Partial<PhantomSolanaProvider> = {
      isConnected: true,
      publicKey: null,
    };
    (getProvider as jest.Mock).mockReturnValue(mockProvider);

    const result = getAccount();

    expect(result).toEqual({
      status: "disconnected",
      address: null,
    });
  });
});
