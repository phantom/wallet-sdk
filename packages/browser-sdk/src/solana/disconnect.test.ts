import { disconnect } from "./disconnect";
import { getProvider } from "./getProvider";
import { addEventListener, clearAllEventListeners } from "./eventListeners";
import type { PhantomSolanaProvider } from "./types";

jest.mock("./getProvider", () => ({
  getProvider: jest.fn(),
}));

// We will spy on triggerEvent rather than fully mocking it
// to ensure the actual callback logic is tested.
const eventListenersModule = jest.requireActual("./eventListeners");
const triggerEventSpy = jest.spyOn(eventListenersModule, "triggerEvent");
const mockDefaultGetProvider = getProvider as jest.MockedFunction<() => PhantomSolanaProvider | null>;

describe("disconnect", () => {
  let mockProvider: Partial<PhantomSolanaProvider>;

  beforeEach(() => {
    jest.clearAllMocks();
    clearAllEventListeners();
    triggerEventSpy.mockClear();
    mockDefaultGetProvider.mockReset();
    mockProvider = {
      disconnect: jest.fn(),
    };
    mockDefaultGetProvider.mockReturnValue(mockProvider as PhantomSolanaProvider);
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
    mockDefaultGetProvider.mockReturnValue(null);

    await expect(disconnect()).rejects.toThrow("Phantom provider not found.");
    expect(mockDefaultGetProvider).toHaveBeenCalledTimes(1);
    expect(triggerEventSpy).not.toHaveBeenCalled();
  });
});
