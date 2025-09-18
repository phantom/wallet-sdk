import type { ProviderStrategy } from "../types";
import { getChainId, switchChain } from "./chainUtils";
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
  request: jest.fn(),
};

jest.mock("./getProvider");

const mockGetProvider = getProviderModule.getProvider as jest.MockedFunction<typeof getProviderModule.getProvider>;

describe("chain utility functions", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGetProvider.mockResolvedValue(mockProvider);
  });

  describe("getChainId", () => {
    it("should get chain ID successfully", async () => {
      const mockChainId = "0x1";
      mockProvider.getChainId.mockResolvedValue(mockChainId);

      const result = await getChainId();

      expect(mockProvider.getChainId).toHaveBeenCalled();
      expect(result).toBe(mockChainId);
    });

    it("should throw error when provider is not found", async () => {
      mockGetProvider.mockResolvedValue(null as any);

      await expect(getChainId()).rejects.toThrow("Provider not found.");
    });

    it("should handle getChainId errors", async () => {
      mockProvider.getChainId.mockRejectedValue(new Error("Failed to get chain ID"));

      await expect(getChainId()).rejects.toThrow("Failed to get chain ID");
    });
  });

  describe("switchChain", () => {
    it("should switch chain successfully", async () => {
      mockProvider.switchChain.mockResolvedValue(undefined);

      await switchChain("0x89");

      expect(mockProvider.switchChain).toHaveBeenCalledWith("0x89");
    });

    it("should throw error when provider is not found", async () => {
      mockGetProvider.mockResolvedValue(null as any);

      await expect(switchChain("0x89")).rejects.toThrow("Provider not found.");
    });

    it("should handle switchChain errors", async () => {
      mockProvider.switchChain.mockRejectedValue(new Error("Failed to switch chain"));

      await expect(switchChain("0x89")).rejects.toThrow("Failed to switch chain");
    });
  });
});
