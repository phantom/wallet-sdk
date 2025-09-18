import { disconnect } from "./disconnect";
import * as getProviderModule from "./getProvider";
import * as eventListenersModule from "./eventListeners";
import type { ProviderStrategy } from "../types";

// Mock the getProvider function
const mockProvider = {
  type: "injected" as ProviderStrategy,
  isConnected: true,
  getProvider: jest.fn(),
  connect: jest.fn(),
  disconnect: jest.fn(),
  getAccounts: jest.fn(),
  signMessage: jest.fn(),
  signPersonalMessage: jest.fn(),
  signTypedData: jest.fn(),
  signIn: jest.fn(),
  sendTransaction: jest.fn(),
  signTransaction: jest.fn(),
  getChainId: jest.fn(),
  switchChain: jest.fn(),
  addChain: jest.fn(),
  request: jest.fn(),
};

jest.mock("./getProvider");
jest.mock("./eventListeners");

const mockGetProvider = getProviderModule.getProvider as jest.MockedFunction<typeof getProviderModule.getProvider>;
const mockTriggerEvent = eventListenersModule.triggerEvent as jest.MockedFunction<
  typeof eventListenersModule.triggerEvent
>;

describe("disconnect", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGetProvider.mockResolvedValue(mockProvider);
  });

  it("should disconnect successfully", async () => {
    mockProvider.disconnect.mockResolvedValue(null);

    await disconnect();

    expect(mockProvider.disconnect).toHaveBeenCalled();
    expect(mockTriggerEvent).toHaveBeenCalledWith("disconnect", []);
  });

  it("should throw error when provider is not found", async () => {
    mockGetProvider.mockResolvedValue(null as any);

    await expect(disconnect()).rejects.toThrow("Provider not found.");
  });

  it("should handle disconnect errors", async () => {
    mockProvider.disconnect.mockRejectedValue(new Error("Disconnect failed"));

    await expect(disconnect()).rejects.toThrow("Disconnect failed");
  });
});
