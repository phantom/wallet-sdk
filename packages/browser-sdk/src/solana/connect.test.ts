import { connect } from "./connect";
import { getProvider } from "./getProvider";

jest.mock("./getProvider", () => ({
  getProvider: jest.fn().mockReturnValue({
    connect: jest.fn().mockImplementation(async ({ onlyIfTrusted }) => {
      if (onlyIfTrusted) {
        throw new Error("Not trusted");
      }
      return { publicKey: { toString: () => "123" } };
    }),
    isConnected: false,
    publicKey: { toString: () => "123" },
  }),
}));

describe("connect", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });
  it("should perform regular non-eager connect when app is not trusted", async () => {
    const provider = getProvider();

    const publicKey = await connect();

    expect(provider.connect).toHaveBeenCalledTimes(2);
    expect(publicKey).toBeDefined();
  });

  it("should perform eager connect when app is already trusted", async () => {
    const provider = getProvider();
    (provider.connect as jest.Mock).mockImplementation(async () => ({ publicKey: { toString: () => "123" } }));
    const publicKey = await connect();
    expect(publicKey).toBeDefined();
  });

  it("should return public key immediately when app is already connected", async () => {
    const provider = getProvider();
    provider.isConnected = true;
    const publicKey = await connect();
    expect(publicKey).toBeDefined();
    expect(provider.connect).not.toHaveBeenCalled();
  });
  it("should throw error when provider is not properly injected", async () => {
    (getProvider as jest.Mock).mockReturnValue(null);
    await expect(connect()).rejects.toThrow("Phantom provider not found.");
  });
});
