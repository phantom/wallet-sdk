import type { ProviderStrategy } from "../types";
import { getAccounts } from "./getAccounts";
import * as getProviderModule from "./getProvider";

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

const mockGetProvider = getProviderModule.getProvider as jest.MockedFunction<typeof getProviderModule.getProvider>;

describe("getAccounts", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGetProvider.mockResolvedValue(mockProvider);
  });

  it("should return accounts successfully", async () => {
    const mockAccounts = ["0x742d35Cc6634C0532925a3b8D4C8db86fB5C4A7E", "0x123456789abcdef"];
    mockProvider.getAccounts.mockResolvedValue(mockAccounts);

    const result = await getAccounts();

    expect(mockProvider.getAccounts).toHaveBeenCalled();
    expect(result).toEqual(mockAccounts);
  });

  it("should return empty array when no accounts", async () => {
    mockProvider.getAccounts.mockResolvedValue([]);

    const result = await getAccounts();

    expect(result).toEqual([]);
  });

  it("should throw error when provider is not found", async () => {
    mockGetProvider.mockResolvedValue(null as any);

    await expect(getAccounts()).rejects.toThrow("Provider not found.");
  });

  it("should handle provider getAccounts errors", async () => {
    mockProvider.getAccounts.mockRejectedValue(new Error("Failed to get accounts"));

    await expect(getAccounts()).rejects.toThrow("Failed to get accounts");
  });
});
