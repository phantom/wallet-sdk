import { sendTransaction, signTransaction } from "./sendTransaction";
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

describe("transaction functions", () => {
  const mockTransaction = {
    to: "0x742d35Cc6634C0532925a3b8D4C8db86fB5C4A7E",
    value: "0x1000000000000000000",
    gas: "0x5208",
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockGetProvider.mockResolvedValue(mockProvider);
    mockProvider.isConnected = true;
  });

  describe("sendTransaction", () => {
    it("should send a transaction successfully", async () => {
      const mockTxHash = "0xabcdef1234567890";
      mockProvider.sendTransaction.mockResolvedValue(mockTxHash);

      const result = await sendTransaction(mockTransaction);

      expect(mockProvider.sendTransaction).toHaveBeenCalledWith(mockTransaction);
      expect(result).toBe(mockTxHash);
    });

    it("should connect if not connected", async () => {
      const mockTxHash = "0xabcdef1234567890";
      mockProvider.isConnected = false;
      mockProvider.connect.mockResolvedValue(["0x742d35Cc6634C0532925a3b8D4C8db86fB5C4A7E"]);
      mockProvider.sendTransaction.mockResolvedValue(mockTxHash);

      const result = await sendTransaction(mockTransaction);

      expect(mockProvider.connect).toHaveBeenCalledWith({ onlyIfTrusted: false });
      expect(mockProvider.sendTransaction).toHaveBeenCalledWith(mockTransaction);
      expect(result).toBe(mockTxHash);
    });

    it("should throw error when provider is not found", async () => {
      mockGetProvider.mockResolvedValue(null as any);

      await expect(sendTransaction(mockTransaction)).rejects.toThrow("Provider not found.");
    });

    it("should handle send transaction errors", async () => {
      mockProvider.sendTransaction.mockRejectedValue(new Error("Transaction failed"));

      await expect(sendTransaction(mockTransaction)).rejects.toThrow("Transaction failed");
    });
  });

  describe("signTransaction", () => {
    it("should sign a transaction successfully", async () => {
      const mockSignedTx =
        "0xf86c8085e8d4a51000825208940x742d35Cc6634C0532925a3b8D4C8db86fB5C4A7E881000000000000000008025a0...";
      mockProvider.signTransaction.mockResolvedValue(mockSignedTx);

      const result = await signTransaction(mockTransaction);

      expect(mockProvider.signTransaction).toHaveBeenCalledWith(mockTransaction);
      expect(result).toBe(mockSignedTx);
    });

    it("should connect if not connected", async () => {
      const mockSignedTx =
        "0xf86c8085e8d4a51000825208940x742d35Cc6634C0532925a3b8D4C8db86fB5C4A7E881000000000000000008025a0...";
      mockProvider.isConnected = false;
      mockProvider.connect.mockResolvedValue(["0x742d35Cc6634C0532925a3b8D4C8db86fB5C4A7E"]);
      mockProvider.signTransaction.mockResolvedValue(mockSignedTx);

      const result = await signTransaction(mockTransaction);

      expect(mockProvider.connect).toHaveBeenCalledWith({ onlyIfTrusted: false });
      expect(mockProvider.signTransaction).toHaveBeenCalledWith(mockTransaction);
      expect(result).toBe(mockSignedTx);
    });

    it("should throw error when provider is not found", async () => {
      mockGetProvider.mockResolvedValue(null as any);

      await expect(signTransaction(mockTransaction)).rejects.toThrow("Provider not found.");
    });

    it("should handle sign transaction errors", async () => {
      mockProvider.signTransaction.mockRejectedValue(new Error("Signing failed"));

      await expect(signTransaction(mockTransaction)).rejects.toThrow("Signing failed");
    });
  });
});
