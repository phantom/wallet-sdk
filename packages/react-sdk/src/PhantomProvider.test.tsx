import * as React from "react";
import { renderHook, waitFor } from "@testing-library/react";
import { PhantomProvider } from "./PhantomProvider";
import { usePhantom } from "./PhantomContext";
import { BrowserSDK, AddressType } from "@phantom/browser-sdk";
import type { BrowserSDKConfig } from "@phantom/browser-sdk";

// Mock BrowserSDK
jest.mock("@phantom/browser-sdk", () => ({
  AddressType: {
    solana: "solana",
    ethereum: "ethereum",
  },
  BrowserSDK: jest.fn().mockImplementation(() => ({
    autoConnect: jest.fn().mockResolvedValue(undefined),
    on: jest.fn(),
    off: jest.fn(),
    configureDebug: jest.fn(),
  })),
  isMobileDevice: jest.fn().mockReturnValue(false),
}));

describe("PhantomProvider", () => {
  const mockConfig: BrowserSDKConfig = {
    appId: "test-app-id",
    providers: ["google", "apple"],
    embeddedWalletType: "user-wallet",
    addressTypes: [AddressType.solana],
    apiBaseUrl: "https://api.test.com",
  };

  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <PhantomProvider config={mockConfig}>{children}</PhantomProvider>
  );

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("isLoading state", () => {
    it("should start with isLoading as true", () => {
      const { result } = renderHook(() => usePhantom(), { wrapper });

      expect(result.current.isLoading).toBe(true);
    });

    it("should set isLoading to false after initialization completes", async () => {
      const { result } = renderHook(() => usePhantom(), { wrapper });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });
    });

    it("should set isLoading to false even if autoConnect fails", async () => {
      // Mock autoConnect to reject
      const mockAutoConnect = jest.fn().mockRejectedValue(new Error("AutoConnect failed"));
      (BrowserSDK as unknown as jest.Mock).mockImplementation(() => ({
        autoConnect: mockAutoConnect,
        on: jest.fn(),
        off: jest.fn(),
        configureDebug: jest.fn(),
      }));

      const { result } = renderHook(() => usePhantom(), { wrapper });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(mockAutoConnect).toHaveBeenCalled();
    });

    it("should have SDK ready when isLoading is false", async () => {
      const { result } = renderHook(() => usePhantom(), { wrapper });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.sdk).not.toBeNull();
      expect(result.current.isClient).toBe(true);
    });
  });

  describe("SDK initialization", () => {
    it("should create SDK instance on client", async () => {
      const { result } = renderHook(() => usePhantom(), { wrapper });

      await waitFor(() => {
        expect(result.current.sdk).not.toBeNull();
      });

      expect(BrowserSDK).toHaveBeenCalledWith(mockConfig);
    });

    it("should call autoConnect during initialization", async () => {
      const mockAutoConnect = jest.fn().mockResolvedValue(undefined);
      (BrowserSDK as unknown as jest.Mock).mockImplementation(() => ({
        autoConnect: mockAutoConnect,
        on: jest.fn(),
        off: jest.fn(),
        configureDebug: jest.fn(),
      }));

      renderHook(() => usePhantom(), { wrapper });

      await waitFor(() => {
        expect(mockAutoConnect).toHaveBeenCalled();
      });
    });
  });
});
