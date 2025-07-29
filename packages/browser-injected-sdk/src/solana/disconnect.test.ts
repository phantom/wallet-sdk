import type { SolanaStrategy } from "./strategies/types";
import { disconnect } from "./disconnect";
import { addEventListener, clearAllEventListeners } from "./eventListeners";
import { getProvider } from "./getProvider";

jest.mock("./getProvider", () => ({
  getProvider: jest.fn(),
}));

// We will spy on triggerEvent rather than fully mocking it
// to ensure the actual callback logic is tested.
const eventListenersModule = jest.requireActual("./eventListeners");
const triggerEventSpy = jest.spyOn(eventListenersModule, "triggerEvent");
const mockDefaultGetProvider = getProvider as jest.MockedFunction<() => Promise<SolanaStrategy | null>>;

describe("disconnect", () => {
  let mockProvider: Partial<SolanaStrategy>;

  beforeEach(() => {
    jest.clearAllMocks();
    clearAllEventListeners();
    triggerEventSpy.mockClear();
    mockDefaultGetProvider.mockReset();
    mockProvider = {
      disconnect: jest.fn(),
    };
    mockDefaultGetProvider.mockReturnValue(Promise.resolve(mockProvider as unknown as SolanaStrategy));
  });

  it("should call disconnect and trigger callbacks", async () => {
    const mockCallback = jest.fn();
    addEventListener("disconnect", mockCallback);

    await disconnect();

    expect(mockDefaultGetProvider).toHaveBeenCalledTimes(1);
    expect(mockProvider.disconnect).toHaveBeenCalledTimes(1);
    expect(triggerEventSpy).toHaveBeenCalledWith("disconnect");
    expect(mockCallback).toHaveBeenCalledTimes(1);
  });

  it("should throw error when provider is not properly injected", async () => {
    mockDefaultGetProvider.mockReturnValue(Promise.resolve(null));

    await expect(disconnect()).rejects.toThrow("Provider not found.");
    expect(mockDefaultGetProvider).toHaveBeenCalledTimes(1);
    expect(triggerEventSpy).not.toHaveBeenCalled();
  });
});
