import { disconnect } from "./disconnect";
import { getProvider } from "./getProvider";
import { onDisconnect, clearAllDisconnectCallbacks } from "./onDisconnect";

jest.mock("./getProvider", () => ({
  getProvider: jest.fn().mockReturnValue({
    disconnect: jest.fn(),
  }),
}));

// We will spy on triggerDisconnectCallbacks rather than fully mocking it
// to ensure the actual callback logic is tested.
const onDisconnectModule = jest.requireActual("./onDisconnect");
const triggerDisconnectCallbacksSpy = jest.spyOn(onDisconnectModule, "triggerDisconnectCallbacks");

describe("disconnect", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    clearAllDisconnectCallbacks();
    triggerDisconnectCallbacksSpy.mockClear();
  });

  it("should call disconnect and trigger callbacks", async () => {
    const provider = getProvider();
    const mockCallback = jest.fn();
    onDisconnect(mockCallback);

    await disconnect();

    expect(provider.disconnect).toHaveBeenCalledTimes(1);
    expect(triggerDisconnectCallbacksSpy).toHaveBeenCalledTimes(1);
    expect(mockCallback).toHaveBeenCalledTimes(1);
  });

  it("should throw error when provider is not properly injected", async () => {
    (getProvider as jest.Mock).mockReturnValue(null);

    await expect(disconnect()).rejects.toThrow("Phantom provider not found.");
    expect(triggerDisconnectCallbacksSpy).not.toHaveBeenCalled();
  });
});
