import type { SolanaAdapter } from "./adapters/types";
import { disconnect } from "./disconnect";
import { addEventListener, clearAllEventListeners } from "./eventListeners";
import { getAdapter } from "./getAdapter";

jest.mock("./getAdapter", () => ({
  getAdapter: jest.fn(),
}));

// We will spy on triggerEvent rather than fully mocking it
// to ensure the actual callback logic is tested.
const eventListenersModule = jest.requireActual("./eventListeners");
const triggerEventSpy = jest.spyOn(eventListenersModule, "triggerEvent");
const mockDefaultGetAdapter = getAdapter as jest.MockedFunction<() => Promise<SolanaAdapter | null>>;

describe("disconnect", () => {
  let mockProvider: Partial<SolanaAdapter>;

  beforeEach(() => {
    jest.clearAllMocks();
    clearAllEventListeners();
    triggerEventSpy.mockClear();
    mockDefaultGetAdapter.mockReset();
    mockProvider = {
      disconnect: jest.fn(),
    };
    mockDefaultGetAdapter.mockReturnValue(Promise.resolve(mockProvider as unknown as SolanaAdapter));
  });

  it("should call disconnect and trigger callbacks", async () => {
    const mockCallback = jest.fn();
    addEventListener("disconnect", mockCallback);

    await disconnect();

    expect(mockDefaultGetAdapter).toHaveBeenCalledTimes(1);
    expect(mockProvider.disconnect).toHaveBeenCalledTimes(1);
    expect(triggerEventSpy).toHaveBeenCalledWith("disconnect");
    expect(mockCallback).toHaveBeenCalledTimes(1);
  });

  it("should throw error when provider is not properly injected", async () => {
    mockDefaultGetAdapter.mockReturnValue(Promise.resolve(null));

    await expect(disconnect()).rejects.toThrow("Phantom provider not found.");
    expect(mockDefaultGetAdapter).toHaveBeenCalledTimes(1);
    expect(triggerEventSpy).not.toHaveBeenCalled();
  });
});
