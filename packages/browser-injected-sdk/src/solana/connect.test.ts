import type { SolanaStrategy } from "./strategies/types";
import { connect } from "./connect";
import { addEventListener, clearAllEventListeners } from "./eventListeners";
import { getProvider } from "./getProvider";

jest.mock("./getProvider", () => ({
  getProvider: jest.fn(),
}));

const mockDefaultGetProvider = getProvider as jest.MockedFunction<() => Promise<SolanaStrategy | null>>;

// We will spy on triggerEvent rather than fully mocking it
// to ensure the actual callback logic is tested.
const eventListenersModule = jest.requireActual("./eventListeners");
const triggerEventSpy = jest.spyOn(eventListenersModule, "triggerEvent");

describe("connect", () => {
  let mockProvider: Partial<SolanaStrategy>;

  beforeEach(() => {
    jest.clearAllMocks();
    clearAllEventListeners();
    triggerEventSpy.mockClear();
    mockDefaultGetProvider.mockReset();
    mockProvider = {
      isConnected: false,
      getAccount: jest.fn().mockImplementation(() => "123"),
      connect: jest.fn().mockImplementation(({ onlyIfTrusted }) => {
        if (onlyIfTrusted) {
          throw new Error("Not trusted");
        }
        return "123";
      }),
    };
    mockDefaultGetProvider.mockReturnValue(Promise.resolve(mockProvider as unknown as SolanaStrategy));
  });

  it("should perform regular non-eager connect when app is not trusted", async () => {
    const mockCallback = jest.fn();
    addEventListener("connect", mockCallback);
    const publicKey = await connect();
    (mockProvider.connect as jest.Mock).mockImplementation(() => ({
      publicKey: { toString: () => "123" } as any,
    }));

    expect(mockDefaultGetProvider).toHaveBeenCalledTimes(1);
    expect(mockProvider.connect).toHaveBeenCalledTimes(2);
    expect(publicKey).toBeDefined();
    expect(triggerEventSpy).toHaveBeenCalledWith("connect", publicKey);
    expect(mockCallback).toHaveBeenCalledWith(publicKey);
  });

  it("should perform eager connect when app is already trusted", async () => {
    const mockCallback = jest.fn();
    addEventListener("connect", mockCallback);
    // Ensure this mock resolves with a string to match what connect() returns
    (mockProvider.connect as jest.Mock).mockImplementation(async () => Promise.resolve("123"));
    const publicKey = await connect();
    expect(mockDefaultGetProvider).toHaveBeenCalledTimes(1);
    expect(publicKey).toBeDefined();
    expect(triggerEventSpy).toHaveBeenCalledWith("connect", publicKey);
    expect(mockCallback).toHaveBeenCalledWith(publicKey);
  });

  it("should return public key immediately when app is already connected", async () => {
    mockProvider.isConnected = true;
    const publicKey = await connect();
    expect(mockDefaultGetProvider).toHaveBeenCalledTimes(1);
    expect(publicKey).toBeDefined();
    expect(triggerEventSpy).not.toHaveBeenCalled();

    expect(mockProvider.connect).not.toHaveBeenCalled();
  });
  it("should throw error when connect fails", async () => {
    mockProvider.isConnected = false;
    (mockProvider.connect as jest.Mock).mockImplementation(async () => {
      await new Promise(resolve => setTimeout(resolve, 100));
      throw new Error("Failed to connect");
    });
    await expect(connect()).rejects.toThrow("Failed to connect to Phantom.");
    expect(mockDefaultGetProvider).toHaveBeenCalledTimes(1);
    expect(triggerEventSpy).not.toHaveBeenCalled();
  });
  it("should throw error when provider is not properly injected", async () => {
    mockDefaultGetProvider.mockReturnValue(Promise.resolve(null));
    await expect(connect()).rejects.toThrow("Provider not found.");
    expect(triggerEventSpy).not.toHaveBeenCalled();
    expect(mockDefaultGetProvider).toHaveBeenCalledTimes(1);
  });
});
