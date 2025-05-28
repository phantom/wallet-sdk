import { disconnect } from "./disconnect";
import { getProvider } from "./getProvider";
import { addEventListener, clearAllEventListeners } from "./eventListeners";

jest.mock("./getProvider", () => ({
  getProvider: jest.fn().mockReturnValue({
    disconnect: jest.fn(),
  }),
}));

// We will spy on triggerEvent rather than fully mocking it
// to ensure the actual callback logic is tested.
const eventListenersModule = jest.requireActual("./eventListeners");
const triggerEventSpy = jest.spyOn(eventListenersModule, "triggerEvent");

describe("disconnect", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    clearAllEventListeners();
    triggerEventSpy.mockClear();
  });

  it("should call disconnect and trigger callbacks", async () => {
    const provider = getProvider();
    const mockCallback = jest.fn();
    addEventListener("disconnect", mockCallback);

    await disconnect();

    expect(provider.disconnect).toHaveBeenCalledTimes(1);
    expect(triggerEventSpy).toHaveBeenCalledWith("disconnect");
    expect(mockCallback).toHaveBeenCalledTimes(1);
  });

  it("should throw error when provider is not properly injected", async () => {
    (getProvider as jest.Mock<any, any>).mockReturnValue(null);

    await expect(disconnect()).rejects.toThrow("Phantom provider not found.");
    expect(triggerEventSpy).not.toHaveBeenCalled();
  });
});
