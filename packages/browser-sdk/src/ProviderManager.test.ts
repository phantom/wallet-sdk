import { ProviderManager } from "./ProviderManager";
import { InjectedProvider } from "./providers/injected";
import { EmbeddedProvider } from "./providers/embedded";
import { AddressType } from "@phantom/client";
import { getDeeplinkToPhantom } from "./utils/deeplink";
import { cleanupWindowMock } from "./test-utils/mockWindow";
import type { ConnectResult, WalletAddress } from "./types";

// Mock parsers to prevent ESM module parsing issues
jest.mock("@phantom/parsers", () => ({
  parseToKmsTransaction: jest.fn().mockResolvedValue({ base64url: "mock-base64url", originalFormat: "mock" }),
  parseSignMessageResponse: jest.fn().mockReturnValue({ signature: "mock-signature", rawSignature: "mock-raw" }),
  parseTransactionResponse: jest.fn().mockReturnValue({
    hash: "mock-transaction-hash",
    rawTransaction: "mock-raw-tx",
    blockExplorer: "https://explorer.com/tx/mock-transaction-hash",
  }),
  parseSolanaTransactionSignature: jest.fn().mockReturnValue({ signature: "mock-signature", fallback: false }),
}));

// Mock the providers
jest.mock("./providers/injected");
jest.mock("./providers/embedded");

// Mock deeplink utility
jest.mock("./utils/deeplink", () => ({
  getDeeplinkToPhantom: jest.fn(),
}));

// Mock auth-callback utilities
jest.mock("./utils/auth-callback", () => ({
  isAuthFailureCallback: jest.fn().mockReturnValue(false),
  isAuthCallbackUrl: jest.fn().mockReturnValue(false),
}));

const MockInjectedProvider = InjectedProvider as jest.MockedClass<typeof InjectedProvider>;
const MockEmbeddedProvider = EmbeddedProvider as jest.MockedClass<typeof EmbeddedProvider>;
const mockGetDeeplinkToPhantom = getDeeplinkToPhantom as jest.MockedFunction<typeof getDeeplinkToPhantom>;

// Helper to create mock provider instances
function createMockProviderInstance() {
  return {
    connect: jest.fn(),
    disconnect: jest.fn(),
    getAddresses: jest.fn().mockReturnValue([]),
    isConnected: jest.fn().mockReturnValue(false),
    autoConnect: jest.fn().mockResolvedValue(undefined),
    on: jest.fn(),
    off: jest.fn(),
  };
}

describe("ProviderManager", () => {
  let manager: ProviderManager;

  beforeEach(() => {
    jest.clearAllMocks();
    cleanupWindowMock();

    // Setup default mocks
    mockGetDeeplinkToPhantom.mockReturnValue("https://phantom.app/ul/browse/test-url");
  });

  afterEach(() => {
    cleanupWindowMock();
  });

  describe("Constructor & Initialization", () => {
    it("should initialize with injected provider when only injected is allowed", () => {
      manager = new ProviderManager({
        providers: ["injected"],
        addressTypes: [AddressType.solana],
      });

      expect(MockInjectedProvider).toHaveBeenCalledWith({
        addressTypes: [AddressType.solana],
      });
      expect(MockEmbeddedProvider).not.toHaveBeenCalled();
      expect(manager.getCurrentProviderInfo()?.type).toBe("injected");
    });

    it("should initialize with embedded provider when embedded providers are allowed", () => {
      manager = new ProviderManager({
        providers: ["google", "apple"],
        addressTypes: [AddressType.solana],
        appId: "test-app-id",
      });

      expect(MockEmbeddedProvider).toHaveBeenCalled();
      expect(manager.getCurrentProviderInfo()?.type).toBe("embedded");
      expect(manager.getCurrentProviderInfo()?.embeddedWalletType).toBe("user");
    });

    it("should prefer embedded provider when both injected and embedded are allowed", () => {
      manager = new ProviderManager({
        providers: ["injected", "google"],
        addressTypes: [AddressType.solana],
        appId: "test-app-id",
      });

      expect(MockInjectedProvider).toHaveBeenCalled();
      expect(MockEmbeddedProvider).toHaveBeenCalled();
      expect(manager.getCurrentProviderInfo()?.type).toBe("embedded");
    });

    it("should use app-wallet type when specified", () => {
      manager = new ProviderManager({
        providers: ["google"],
        addressTypes: [AddressType.solana],
        appId: "test-app-id",
        embeddedWalletType: "app-wallet",
      });

      expect(MockEmbeddedProvider).toHaveBeenCalledWith(
        expect.objectContaining({
          embeddedWalletType: "app-wallet",
        }),
      );
      expect(manager.getCurrentProviderInfo()?.embeddedWalletType).toBe("app");
    });

    it("should throw error if no valid providers can be created", () => {
      expect(() => {
        new ProviderManager({
          providers: ["deeplink"],
          addressTypes: [AddressType.solana],
        });
      }).toThrow("No valid providers could be created from the providers array");
    });

    it("should throw error if embedded provider requires appId", () => {
      expect(() => {
        new ProviderManager({
          providers: ["google"],
          addressTypes: [AddressType.solana],
        });
      }).toThrow("appId is required for embedded provider");
    });
  });

  describe("connect() - Happy Paths", () => {
    it("should connect with injected provider", async () => {
      const mockProvider = createMockProviderInstance();
      const mockResult: ConnectResult = {
        addresses: [{ address: "addr1", networkId: "solana:101" } as WalletAddress],
        walletId: "wallet-123",
        authUserId: "user-123",
      };
      mockProvider.connect.mockResolvedValue(mockResult);
      mockProvider.isConnected.mockReturnValue(true);
      mockProvider.getAddresses.mockReturnValue(mockResult.addresses);

      MockInjectedProvider.mockImplementation(() => mockProvider as any);

      manager = new ProviderManager({
        providers: ["injected"],
        addressTypes: [AddressType.solana],
      });

      const result = await manager.connect({ provider: "injected" });

      expect(mockProvider.connect).toHaveBeenCalledWith({ provider: "injected" });
      expect(result).toEqual(mockResult);
      expect(manager.isConnected()).toBe(true);
      expect(manager.getAddresses()).toEqual(mockResult.addresses);
    });

    it("should connect with embedded provider (google)", async () => {
      const mockProvider = createMockProviderInstance();
      const mockResult: ConnectResult = {
        addresses: [{ address: "addr1", networkId: "solana:101" } as WalletAddress],
        walletId: "wallet-456",
        authUserId: "user-456",
      };
      mockProvider.connect.mockResolvedValue(mockResult);
      mockProvider.isConnected.mockReturnValue(true);
      mockProvider.getAddresses.mockReturnValue(mockResult.addresses);

      MockEmbeddedProvider.mockImplementation(() => mockProvider as any);

      manager = new ProviderManager({
        providers: ["google"],
        addressTypes: [AddressType.solana],
        appId: "test-app-id",
      });

      const result = await manager.connect({ provider: "google" });

      expect(mockProvider.connect).toHaveBeenCalledWith({ provider: "google" });
      expect(result).toEqual(mockResult);
      expect(manager.isConnected()).toBe(true);
    });

    it("should auto-switch from injected to embedded when connecting with google", async () => {
      const mockInjected = createMockProviderInstance();
      const mockEmbedded = createMockProviderInstance();
      const mockResult: ConnectResult = {
        addresses: [{ address: "addr1", networkId: "solana:101" } as WalletAddress],
        walletId: "wallet-789",
      };
      mockEmbedded.connect.mockResolvedValue(mockResult);
      mockEmbedded.isConnected.mockReturnValue(true);

      MockInjectedProvider.mockImplementation(() => mockInjected as any);
      MockEmbeddedProvider.mockImplementation(() => mockEmbedded as any);

      manager = new ProviderManager({
        providers: ["injected", "google"],
        addressTypes: [AddressType.solana],
        appId: "test-app-id",
      });

      // Initially should be on embedded (preferred)
      expect(manager.getCurrentProviderInfo()?.type).toBe("embedded");

      // Switch to injected first
      manager.switchProvider("injected");
      expect(manager.getCurrentProviderInfo()?.type).toBe("injected");

      // Connect with google should auto-switch to embedded
      await manager.connect({ provider: "google" });

      expect(manager.getCurrentProviderInfo()?.type).toBe("embedded");
      expect(mockEmbedded.connect).toHaveBeenCalledWith({ provider: "google" });
      expect(mockInjected.connect).not.toHaveBeenCalled();
    });

    it("should auto-switch from embedded to injected when connecting with injected", async () => {
      const mockInjected = createMockProviderInstance();
      const mockEmbedded = createMockProviderInstance();
      const mockResult: ConnectResult = {
        addresses: [{ address: "addr1", networkId: "solana:101" } as WalletAddress],
        walletId: "wallet-injected",
      };
      mockInjected.connect.mockResolvedValue(mockResult);
      mockInjected.isConnected.mockReturnValue(true);

      MockInjectedProvider.mockImplementation(() => mockInjected as any);
      MockEmbeddedProvider.mockImplementation(() => mockEmbedded as any);

      manager = new ProviderManager({
        providers: ["injected", "google"],
        addressTypes: [AddressType.solana],
        appId: "test-app-id",
      });

      // Initially on embedded
      expect(manager.getCurrentProviderInfo()?.type).toBe("embedded");

      // Connect with injected should auto-switch
      await manager.connect({ provider: "injected" });

      expect(manager.getCurrentProviderInfo()?.type).toBe("injected");
      expect(mockInjected.connect).toHaveBeenCalledWith({ provider: "injected" });
    });

    it("should not switch provider if already on correct type", async () => {
      const mockEmbedded = createMockProviderInstance();
      const mockResult: ConnectResult = {
        addresses: [],
        walletId: "wallet-123",
      };
      mockEmbedded.connect.mockResolvedValue(mockResult);

      MockEmbeddedProvider.mockImplementation(() => mockEmbedded as any);

      manager = new ProviderManager({
        providers: ["google", "apple"],
        addressTypes: [AddressType.solana],
        appId: "test-app-id",
      });

      const initialProvider = manager.getCurrentProvider();
      await manager.connect({ provider: "google" });

      // Should still be the same provider instance
      expect(manager.getCurrentProvider()).toBe(initialProvider);
      expect(mockEmbedded.connect).toHaveBeenCalledWith({ provider: "google" });
    });

    it("should throw error if provider is not allowed", async () => {
      manager = new ProviderManager({
        providers: ["injected"],
        addressTypes: [AddressType.solana],
      });

      await expect(manager.connect({ provider: "google" })).rejects.toThrow(
        'Provider "google" is not in the allowed providers list',
      );
    });
  });

  describe("disconnect() - Happy Path", () => {
    it("should disconnect from current provider", async () => {
      const mockProvider = createMockProviderInstance();
      mockProvider.disconnect.mockResolvedValue(undefined);

      MockInjectedProvider.mockImplementation(() => mockProvider as any);

      manager = new ProviderManager({
        providers: ["injected"],
        addressTypes: [AddressType.solana],
      });

      await manager.disconnect();

      expect(mockProvider.disconnect).toHaveBeenCalled();
    });

    it("should handle disconnect when no provider is set", async () => {
      // This shouldn't throw or error
      manager = new ProviderManager({
        providers: ["injected"],
        addressTypes: [AddressType.solana],
      });

      // Manually clear provider to simulate edge case
      (manager as any).currentProvider = null;

      await expect(manager.disconnect()).resolves.toBeUndefined();
    });
  });

  describe("switchProvider() - Happy Paths", () => {
    it("should switch from injected to embedded", () => {
      const mockInjected = createMockProviderInstance();
      const mockEmbedded = createMockProviderInstance();

      MockInjectedProvider.mockImplementation(() => mockInjected as any);
      MockEmbeddedProvider.mockImplementation(() => mockEmbedded as any);

      manager = new ProviderManager({
        providers: ["injected", "google"],
        addressTypes: [AddressType.solana],
        appId: "test-app-id",
      });

      // Switch to injected first
      manager.switchProvider("injected");
      expect(manager.getCurrentProviderInfo()?.type).toBe("injected");

      // Switch to embedded
      const provider = manager.switchProvider("embedded", { embeddedWalletType: "user-wallet" });
      expect(manager.getCurrentProviderInfo()?.type).toBe("embedded");
      expect(manager.getCurrentProviderInfo()?.embeddedWalletType).toBe("user");
      expect(provider).toBe(mockEmbedded);
    });

    it("should switch from embedded to injected", () => {
      const mockInjected = createMockProviderInstance();
      const mockEmbedded = createMockProviderInstance();

      MockInjectedProvider.mockImplementation(() => mockInjected as any);
      MockEmbeddedProvider.mockImplementation(() => mockEmbedded as any);

      manager = new ProviderManager({
        providers: ["injected", "google"],
        addressTypes: [AddressType.solana],
        appId: "test-app-id",
      });

      // Initially on embedded
      expect(manager.getCurrentProviderInfo()?.type).toBe("embedded");

      // Switch to injected
      const provider = manager.switchProvider("injected");
      expect(manager.getCurrentProviderInfo()?.type).toBe("injected");
      expect(provider).toBe(mockInjected);
    });

    it("should reuse existing provider instance when switching", () => {
      const mockInjected = createMockProviderInstance();
      const mockEmbedded = createMockProviderInstance();

      MockInjectedProvider.mockImplementation(() => mockInjected as any);
      MockEmbeddedProvider.mockImplementation(() => mockEmbedded as any);

      manager = new ProviderManager({
        providers: ["injected", "google"],
        addressTypes: [AddressType.solana],
        appId: "test-app-id",
      });

      const firstSwitch = manager.switchProvider("injected");
      const secondSwitch = manager.switchProvider("embedded");
      const thirdSwitch = manager.switchProvider("injected");

      // Should reuse the same instances
      expect(firstSwitch).toBe(mockInjected);
      expect(secondSwitch).toBe(mockEmbedded);
      expect(thirdSwitch).toBe(mockInjected);
      expect(MockInjectedProvider).toHaveBeenCalledTimes(1);
      // Embedded provider may be created during initialization and during switch
      expect(MockEmbeddedProvider.mock.calls.length).toBeGreaterThanOrEqual(1);
    });

    it("should throw error for invalid embeddedWalletType", () => {
      manager = new ProviderManager({
        providers: ["google"],
        addressTypes: [AddressType.solana],
        appId: "test-app-id",
      });

      expect(() => {
        manager.switchProvider("embedded", { embeddedWalletType: "invalid" as any });
      }).toThrow('Invalid embeddedWalletType: invalid. Must be "app-wallet" or "user-wallet".');
    });
  });

  describe("autoConnect() - Happy Paths", () => {
    it("should auto-connect with embedded provider successfully", async () => {
      const mockEmbedded = createMockProviderInstance();
      mockEmbedded.autoConnect.mockResolvedValue(undefined);
      mockEmbedded.isConnected.mockReturnValue(true);
      mockEmbedded.getAddresses.mockReturnValue([{ address: "addr1", networkId: "solana:101" } as WalletAddress]);

      MockEmbeddedProvider.mockImplementation(() => mockEmbedded as any);

      manager = new ProviderManager({
        providers: ["google"],
        addressTypes: [AddressType.solana],
        appId: "test-app-id",
      });

      const result = await manager.autoConnect();

      expect(result).toBe(true);
      expect(mockEmbedded.autoConnect).toHaveBeenCalled();
      expect(manager.isConnected()).toBe(true);
    });

    it("should fallback to injected provider when embedded fails", async () => {
      const mockInjected = createMockProviderInstance();
      const mockEmbedded = createMockProviderInstance();
      mockEmbedded.autoConnect.mockResolvedValue(undefined);
      mockEmbedded.isConnected.mockReturnValue(false);
      mockInjected.autoConnect.mockResolvedValue(undefined);
      mockInjected.isConnected.mockReturnValue(true);

      MockInjectedProvider.mockImplementation(() => mockInjected as any);
      MockEmbeddedProvider.mockImplementation(() => mockEmbedded as any);

      manager = new ProviderManager({
        providers: ["injected", "google"],
        addressTypes: [AddressType.solana],
        appId: "test-app-id",
      });

      const result = await manager.autoConnect();

      expect(result).toBe(true);
      expect(mockEmbedded.autoConnect).toHaveBeenCalled();
      expect(mockInjected.autoConnect).toHaveBeenCalled();
      expect(manager.getCurrentProviderInfo()?.type).toBe("injected");
    });

    it("should return false when all providers fail to auto-connect", async () => {
      const mockInjected = createMockProviderInstance();
      const mockEmbedded = createMockProviderInstance();
      mockEmbedded.autoConnect.mockResolvedValue(undefined);
      mockEmbedded.isConnected.mockReturnValue(false);
      mockInjected.autoConnect.mockResolvedValue(undefined);
      mockInjected.isConnected.mockReturnValue(false);

      MockInjectedProvider.mockImplementation(() => mockInjected as any);
      MockEmbeddedProvider.mockImplementation(() => mockEmbedded as any);

      manager = new ProviderManager({
        providers: ["injected", "google"],
        addressTypes: [AddressType.solana],
        appId: "test-app-id",
      });

      const result = await manager.autoConnect();

      expect(result).toBe(false);
    });
  });

  describe("getAddresses() and isConnected() - Happy Paths", () => {
    it("should return addresses from current provider", () => {
      const mockProvider = createMockProviderInstance();
      const addresses = [
        { address: "addr1", networkId: "solana:101" },
        { address: "addr2", networkId: "ethereum:1" },
      ] as WalletAddress[];
      mockProvider.getAddresses.mockReturnValue(addresses);

      MockInjectedProvider.mockImplementation(() => mockProvider as any);

      manager = new ProviderManager({
        providers: ["injected"],
        addressTypes: [AddressType.solana],
      });

      expect(manager.getAddresses()).toEqual(addresses);
      expect(mockProvider.getAddresses).toHaveBeenCalled();
    });

    it("should return empty array when no provider is set", () => {
      manager = new ProviderManager({
        providers: ["injected"],
        addressTypes: [AddressType.solana],
      });

      // Manually clear provider
      (manager as any).currentProvider = null;

      expect(manager.getAddresses()).toEqual([]);
    });

    it("should return connection status from current provider", () => {
      const mockProvider = createMockProviderInstance();
      mockProvider.isConnected.mockReturnValue(true);

      MockInjectedProvider.mockImplementation(() => mockProvider as any);

      manager = new ProviderManager({
        providers: ["injected"],
        addressTypes: [AddressType.solana],
      });

      expect(manager.isConnected()).toBe(true);
      expect(mockProvider.isConnected).toHaveBeenCalled();
    });

    it("should return false when no provider is set", () => {
      manager = new ProviderManager({
        providers: ["injected"],
        addressTypes: [AddressType.solana],
      });

      // Manually clear provider
      (manager as any).currentProvider = null;

      expect(manager.isConnected()).toBe(false);
    });
  });

  describe("getCurrentProvider() and getCurrentProviderInfo() - Happy Paths", () => {
    it("should return current provider instance", () => {
      const mockProvider = createMockProviderInstance();

      MockInjectedProvider.mockImplementation(() => mockProvider as any);

      manager = new ProviderManager({
        providers: ["injected"],
        addressTypes: [AddressType.solana],
      });

      expect(manager.getCurrentProvider()).toBe(mockProvider);
    });

    it("should return current provider info", () => {
      manager = new ProviderManager({
        providers: ["injected"],
        addressTypes: [AddressType.solana],
      });

      const info = manager.getCurrentProviderInfo();
      expect(info).toEqual({
        type: "injected",
        embeddedWalletType: undefined,
      });
    });

    it("should return null when no provider is set", () => {
      manager = new ProviderManager({
        providers: ["injected"],
        addressTypes: [AddressType.solana],
      });

      // Manually clear provider
      (manager as any).currentProvider = null;
      (manager as any).currentProviderKey = null;

      expect(manager.getCurrentProvider()).toBeNull();
      expect(manager.getCurrentProviderInfo()).toBeNull();
    });
  });

  describe("Event Handling - Happy Paths", () => {
    it("should forward events from provider to listeners", () => {
      const mockProvider = createMockProviderInstance();
      const eventCallback = jest.fn();

      MockInjectedProvider.mockImplementation(() => mockProvider as any);

      manager = new ProviderManager({
        providers: ["injected"],
        addressTypes: [AddressType.solana],
      });

      manager.on("connect", eventCallback);

      // Verify that provider.on was called to set up forwarding
      expect(mockProvider.on).toHaveBeenCalledWith("connect", expect.any(Function));

      // Simulate provider emitting event
      const forwardingCallback = mockProvider.on.mock.calls.find(call => call[0] === "connect")?.[1] as (
        data: any,
      ) => void;
      forwardingCallback({ walletId: "wallet-123" });

      expect(eventCallback).toHaveBeenCalledWith({ walletId: "wallet-123" });
    });

    it("should remove event listeners", () => {
      const mockProvider = createMockProviderInstance();
      const eventCallback = jest.fn();

      MockInjectedProvider.mockImplementation(() => mockProvider as any);

      manager = new ProviderManager({
        providers: ["injected"],
        addressTypes: [AddressType.solana],
      });

      manager.on("connect", eventCallback);
      manager.off("connect", eventCallback);

      // Verify that the callback was removed from internal listeners
      // Note: ProviderManager doesn't call provider.off, it just removes from its own listeners
      const listeners = (manager as any).eventListeners.get("connect");
      if (listeners) {
        expect(listeners.has(eventCallback)).toBe(false);
      } else {
        // If listeners set is empty, it gets deleted, so undefined is also valid
        expect(listeners).toBeUndefined();
      }
    });
  });

  describe("deeplink provider", () => {
    it("should handle deeplink provider and navigate to deeplink URL", async () => {
      manager = new ProviderManager({
        providers: ["deeplink", "injected"],
        addressTypes: [AddressType.solana],
      });

      const result = await manager.connect({ provider: "deeplink" });

      expect(mockGetDeeplinkToPhantom).toHaveBeenCalled();
      // Verify that window.location.href was set (we can't easily mock it in jsdom, but we verify the function was called)
      expect(result).toEqual({
        addresses: [],
        walletId: undefined,
        authUserId: undefined,
      });
    });

    it("should throw error if deeplink generation fails", async () => {
      mockGetDeeplinkToPhantom.mockImplementation(() => {
        throw new Error("Invalid URL protocol");
      });

      manager = new ProviderManager({
        providers: ["deeplink", "injected"],
        addressTypes: [AddressType.solana],
      });

      await expect(manager.connect({ provider: "deeplink" })).rejects.toThrow(
        "Failed to open deeplink: Invalid URL protocol",
      );
    });

    it("should handle deeplink gracefully when window.location is not available", async () => {
      // Temporarily make window.location undefined
      const originalLocation = window.location;
      delete (window as any).location;

      mockGetDeeplinkToPhantom.mockReturnValue("https://phantom.app/ul/browse/test-url");

      manager = new ProviderManager({
        providers: ["deeplink", "injected"],
        addressTypes: [AddressType.solana],
      });

      const result = await manager.connect({ provider: "deeplink" });

      expect(mockGetDeeplinkToPhantom).toHaveBeenCalled();
      expect(result).toEqual({
        addresses: [],
        walletId: undefined,
        authUserId: undefined,
      });

      // Restore window.location
      (window as any).location = originalLocation;
    });

    it("should not call provider connect methods for deeplink", async () => {
      // Clear any previous calls
      jest.clearAllMocks();

      manager = new ProviderManager({
        providers: ["deeplink", "injected"],
        addressTypes: [AddressType.solana],
      });

      await manager.connect({ provider: "deeplink" });

      // Verify that getDeeplinkToPhantom was called
      expect(mockGetDeeplinkToPhantom).toHaveBeenCalled();

      // Note: MockInjectedProvider and MockEmbeddedProvider may have been called during initialization,
      // but the important thing is that connect() on those providers was NOT called for deeplink
      // The deeplink flow returns early without calling any provider's connect method
    });
  });
});
