import * as React from "react";
import { renderHook, waitFor } from "@testing-library/react";
import { PhantomProvider, usePhantom } from "./PhantomProvider";
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
  }))
}));

describe("PhantomProvider", () => {
  const mockConfig: BrowserSDKConfig = {
    appId: "test-app-id",
    providerType: "embedded",
    embeddedWalletType: "user-wallet",
    addressTypes: [AddressType.solana],
    apiBaseUrl: "https://api.test.com",
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("isLoaded state", () => {
    it("should start with isLoaded as false", () => {
      const wrapper = ({ children }: { children: React.ReactNode }) => (
        <PhantomProvider config={mockConfig}>{children}</PhantomProvider>
      );

      const { result } = renderHook(() => usePhantom(), { wrapper });

      expect(result.current.isLoaded).toBe(false);
    });

    it("should set isLoaded to true after initialization completes", async () => {
      const wrapper = ({ children }: { children: React.ReactNode }) => (
        <PhantomProvider config={mockConfig}>{children}</PhantomProvider>
      );

      const { result } = renderHook(() => usePhantom(), { wrapper });

      await waitFor(() => {
        expect(result.current.isLoaded).toBe(true);
      });
    });

    it("should set isLoaded to true even if autoConnect fails", async () => {
      // Mock autoConnect to reject
      const mockAutoConnect = jest.fn().mockRejectedValue(new Error("AutoConnect failed"));
      (BrowserSDK as unknown as jest.Mock).mockImplementation(() => ({
        autoConnect: mockAutoConnect,
        on: jest.fn(),
        off: jest.fn(),
        configureDebug: jest.fn(),
      }));

      const wrapper = ({ children }: { children: React.ReactNode }) => (
        <PhantomProvider config={mockConfig}>{children}</PhantomProvider>
      );

      const { result } = renderHook(() => usePhantom(), { wrapper });

      await waitFor(() => {
        expect(result.current.isLoaded).toBe(true);
      });

      expect(mockAutoConnect).toHaveBeenCalled();
    });

    it("should have SDK ready when isLoaded is true", async () => {
      const wrapper = ({ children }: { children: React.ReactNode }) => (
        <PhantomProvider config={mockConfig}>{children}</PhantomProvider>
      );

      const { result } = renderHook(() => usePhantom(), { wrapper });

      await waitFor(() => {
        expect(result.current.isLoaded).toBe(true);
      });

      expect(result.current.sdk).not.toBeNull();
      expect(result.current.isClient).toBe(true);
    });
  });

  describe("SDK initialization", () => {
    it("should create SDK instance on client", async () => {
      const wrapper = ({ children }: { children: React.ReactNode }) => (
        <PhantomProvider config={mockConfig}>{children}</PhantomProvider>
      );

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

      const wrapper = ({ children }: { children: React.ReactNode }) => (
        <PhantomProvider config={mockConfig}>{children}</PhantomProvider>
      );

      renderHook(() => usePhantom(), { wrapper });

      await waitFor(() => {
        expect(mockAutoConnect).toHaveBeenCalled();
      });
    });
  });
});
