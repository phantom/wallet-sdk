import { connect } from "./connect";
import * as getProviderModule from "./getProvider";
import * as eventListenersModule from "./eventListeners";
import type { ProviderStrategy } from "../types";

// Mock the getProvider function
const mockProvider = {
  type: "injected" as ProviderStrategy,
  isConnected: false,
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

describe("connect", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGetProvider.mockResolvedValue(mockProvider);
    mockProvider.isConnected = false;
  });

  it("should return existing accounts when already connected", async () => {
    const mockAccounts = ["0x742d35Cc6634C0532925a3b8D4C8db86fB5C4A7E"];
    mockProvider.isConnected = true;
    mockProvider.getAccounts.mockResolvedValue(mockAccounts);

    const result = await connect();

    expect(mockProvider.getAccounts).toHaveBeenCalled();
    expect(result).toEqual(mockAccounts);
  });

  it("should try eager connect first", async () => {
    const mockAccounts = ["0x742d35Cc6634C0532925a3b8D4C8db86fB5C4A7E"];
    mockProvider.connect.mockResolvedValueOnce(mockAccounts);

    const result = await connect();

    expect(mockProvider.connect).toHaveBeenCalledWith({ onlyIfTrusted: true });
    expect(mockTriggerEvent).toHaveBeenCalledWith("connect", mockAccounts);
    expect(result).toEqual(mockAccounts);
  });

  it("should fallback to prompted connect when eager connect fails", async () => {
    const mockAccounts = ["0x742d35Cc6634C0532925a3b8D4C8db86fB5C4A7E"];
    mockProvider.connect.mockRejectedValueOnce(new Error("User not authenticated")).mockResolvedValueOnce(mockAccounts);

    const result = await connect();

    expect(mockProvider.connect).toHaveBeenCalledWith({ onlyIfTrusted: true });
    expect(mockProvider.connect).toHaveBeenCalledWith({ onlyIfTrusted: false });
    expect(mockTriggerEvent).toHaveBeenCalledWith("connect", mockAccounts);
    expect(result).toEqual(mockAccounts);
  });

  it("should throw error when both connect attempts fail", async () => {
    mockProvider.connect.mockRejectedValueOnce(new Error("User not authenticated")).mockResolvedValueOnce(undefined);

    await expect(connect()).rejects.toThrow("Failed to connect to Phantom.");
  });

  it("should throw error when provider is not found", async () => {
    mockGetProvider.mockResolvedValue(null as any);

    await expect(connect()).rejects.toThrow("Provider not found.");
  });

  it("should handle empty accounts array", async () => {
    mockProvider.connect.mockResolvedValueOnce([]).mockResolvedValueOnce([]);

    await expect(connect()).rejects.toThrow("Failed to connect to Phantom.");
  });
});
