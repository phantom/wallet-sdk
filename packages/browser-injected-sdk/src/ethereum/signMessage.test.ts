import { signMessage, signPersonalMessage, signTypedData } from "./signMessage";
import * as getProviderModule from "./getProvider";
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

const mockGetProvider = getProviderModule.getProvider as jest.MockedFunction<typeof getProviderModule.getProvider>;

describe("signMessage", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGetProvider.mockResolvedValue(mockProvider);
    mockProvider.isConnected = true;
  });

  describe("signMessage", () => {
    it("should sign a message successfully", async () => {
      const mockSignature = "0x1234567890abcdef";
      mockProvider.signMessage.mockResolvedValue(mockSignature);

      const result = await signMessage("Hello World", "0x742d35Cc6634C0532925a3b8D4C8db86fB5C4A7E");

      expect(mockProvider.signMessage).toHaveBeenCalledWith(
        "Hello World",
        "0x742d35Cc6634C0532925a3b8D4C8db86fB5C4A7E",
      );
      expect(result).toBe(mockSignature);
    });

    it("should connect if not connected", async () => {
      const mockSignature = "0x1234567890abcdef";
      mockProvider.isConnected = false;
      mockProvider.connect.mockResolvedValue(["0x742d35Cc6634C0532925a3b8D4C8db86fB5C4A7E"]);
      mockProvider.signMessage.mockResolvedValue(mockSignature);

      const result = await signMessage("Hello World", "0x742d35Cc6634C0532925a3b8D4C8db86fB5C4A7E");

      expect(mockProvider.connect).toHaveBeenCalledWith({ onlyIfTrusted: false });
      expect(mockProvider.signMessage).toHaveBeenCalledWith(
        "Hello World",
        "0x742d35Cc6634C0532925a3b8D4C8db86fB5C4A7E",
      );
      expect(result).toBe(mockSignature);
    });

    it("should throw error when provider is not found", async () => {
      mockGetProvider.mockResolvedValue(null as any);

      await expect(signMessage("Hello World", "0x742d35Cc6634C0532925a3b8D4C8db86fB5C4A7E")).rejects.toThrow(
        "Provider not found.",
      );
    });
  });

  describe("signPersonalMessage", () => {
    it("should sign a personal message successfully", async () => {
      const mockSignature = "0x1234567890abcdef";
      mockProvider.signPersonalMessage.mockResolvedValue(mockSignature);

      const result = await signPersonalMessage("Hello World", "0x742d35Cc6634C0532925a3b8D4C8db86fB5C4A7E");

      expect(mockProvider.signPersonalMessage).toHaveBeenCalledWith(
        "Hello World",
        "0x742d35Cc6634C0532925a3b8D4C8db86fB5C4A7E",
      );
      expect(result).toBe(mockSignature);
    });

    it("should connect if not connected", async () => {
      const mockSignature = "0x1234567890abcdef";
      mockProvider.isConnected = false;
      mockProvider.connect.mockResolvedValue(["0x742d35Cc6634C0532925a3b8D4C8db86fB5C4A7E"]);
      mockProvider.signPersonalMessage.mockResolvedValue(mockSignature);

      const result = await signPersonalMessage("Hello World", "0x742d35Cc6634C0532925a3b8D4C8db86fB5C4A7E");

      expect(mockProvider.connect).toHaveBeenCalledWith({ onlyIfTrusted: false });
      expect(mockProvider.signPersonalMessage).toHaveBeenCalledWith(
        "Hello World",
        "0x742d35Cc6634C0532925a3b8D4C8db86fB5C4A7E",
      );
      expect(result).toBe(mockSignature);
    });
  });

  describe("signTypedData", () => {
    it("should sign typed data successfully", async () => {
      const mockSignature = "0x1234567890abcdef";
      const typedData = { types: {}, primaryType: "Test", domain: {}, message: {} };
      mockProvider.signTypedData.mockResolvedValue(mockSignature);

      const result = await signTypedData(typedData, "0x742d35Cc6634C0532925a3b8D4C8db86fB5C4A7E");

      expect(mockProvider.signTypedData).toHaveBeenCalledWith(typedData, "0x742d35Cc6634C0532925a3b8D4C8db86fB5C4A7E");
      expect(result).toBe(mockSignature);
    });

    it("should connect if not connected", async () => {
      const mockSignature = "0x1234567890abcdef";
      const typedData = { types: {}, primaryType: "Test", domain: {}, message: {} };
      mockProvider.isConnected = false;
      mockProvider.connect.mockResolvedValue(["0x742d35Cc6634C0532925a3b8D4C8db86fB5C4A7E"]);
      mockProvider.signTypedData.mockResolvedValue(mockSignature);

      const result = await signTypedData(typedData, "0x742d35Cc6634C0532925a3b8D4C8db86fB5C4A7E");

      expect(mockProvider.connect).toHaveBeenCalledWith({ onlyIfTrusted: false });
      expect(mockProvider.signTypedData).toHaveBeenCalledWith(typedData, "0x742d35Cc6634C0532925a3b8D4C8db86fB5C4A7E");
      expect(result).toBe(mockSignature);
    });
  });
});
