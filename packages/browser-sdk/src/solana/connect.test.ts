import { connect } from "./connect";
import { getProvider } from "./getProvider";
import { onConnect, clearAllConnectCallbacks } from "./onConnect";

jest.mock("./getProvider", () => ({
  getProvider: jest.fn().mockReturnValue({
    connect: jest.fn().mockImplementation(async ({ onlyIfTrusted }) => {
      if (onlyIfTrusted) {
        throw new Error("Not trusted");
      }
      return Promise.resolve({ publicKey: { toString: () => "123" } });
    }),
    isConnected: false,
    publicKey: { toString: () => "123" },
  }),
}));

// We will spy on triggerConnectCallbacks rather than fully mocking it
// to ensure the actual callback logic is tested.
const onConnectModule = jest.requireActual("./onConnect");
const triggerConnectCallbacksSpy = jest.spyOn(onConnectModule, "triggerConnectCallbacks");

describe("connect", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    clearAllConnectCallbacks();
    triggerConnectCallbacksSpy.mockClear();
  });
  it("should perform regular non-eager connect when app is not trusted", async () => {
    const provider = getProvider();
    const mockCallback = jest.fn();
    onConnect(mockCallback);

    const publicKey = await connect();

    expect(provider.connect).toHaveBeenCalledTimes(2);
    expect(publicKey).toBeDefined();
    expect(triggerConnectCallbacksSpy).toHaveBeenCalledWith(publicKey);
    expect(mockCallback).toHaveBeenCalledWith(publicKey);
  });

  it("should perform eager connect when app is already trusted", async () => {
    const provider = getProvider();
    const mockCallback = jest.fn();
    onConnect(mockCallback);
    // Ensure this mock resolves with a string to match what connect() returns
    (provider.connect as jest.Mock).mockImplementation(async () =>
      Promise.resolve({ publicKey: { toString: () => "123" } }),
    );
    const publicKey = await connect();
    expect(publicKey).toBeDefined();
    expect(triggerConnectCallbacksSpy).toHaveBeenCalledWith(publicKey);
    expect(mockCallback).toHaveBeenCalledWith(publicKey);
  });

  it("should return public key immediately when app is already connected", async () => {
    const provider = getProvider();
    provider.isConnected = true;
    const publicKey = await connect();
    expect(publicKey).toBeDefined();
    expect(provider.connect).not.toHaveBeenCalled();
    expect(triggerConnectCallbacksSpy).not.toHaveBeenCalled();
  });
  it("should throw error when connect fails", async () => {
    const provider = getProvider();
    provider.isConnected = false;
    (provider.connect as jest.Mock).mockImplementation(async () => {
      await new Promise(resolve => setTimeout(resolve, 100));
      throw new Error("Failed to connect");
    });
    await expect(connect()).rejects.toThrow("Failed to connect to Phantom.");
    expect(triggerConnectCallbacksSpy).not.toHaveBeenCalled();
  });
  it("should throw error when provider is not properly injected", async () => {
    (getProvider as jest.Mock).mockReturnValue(null);
    await expect(connect()).rejects.toThrow("Phantom provider not found.");
    expect(triggerConnectCallbacksSpy).not.toHaveBeenCalled();
  });
});
