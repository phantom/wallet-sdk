import { createAutoConfirmPlugin } from "@phantom/browser-sdk/auto-confirm";
import { act, renderHook, waitFor } from "@testing-library/react";
import * as React from "react";
import { PhantomProvider } from "../PhantomContext";
import { useAutoConfirmState } from "./useAutoConfirmState";
import type { NetworkID } from "./types";
import * as PhantomContext from "../PhantomContext";

const mockAutoConfirmPlugin = {
  ...createAutoConfirmPlugin().create(),
  autoConfirmStatus: jest.fn(),
  autoConfirmSupportedChains: jest.fn(),
  autoConfirmEnable: jest.fn(),
  autoConfirmDisable: jest.fn(),
};

const createPlugin = {
  name: "autoConfirm",
  create: () => {
    return mockAutoConfirmPlugin;
  },
};

const sharedConfig = {
  wrapper: ({ children }: { children: React.ReactNode }) => (
    <PhantomProvider
      config={{
        plugins: [createPlugin],
      }}
    >
      {children}
    </PhantomProvider>
  ),
};

describe("useAutoConfirmState", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockAutoConfirmPlugin.autoConfirmStatus.mockResolvedValue({
      enabled: true,
      chains: ["solana:101" as NetworkID],
    });
    mockAutoConfirmPlugin.autoConfirmSupportedChains.mockResolvedValue({
      chains: ["solana:101" as NetworkID, "eip155:1" as NetworkID],
    });
  });

  it("should fetch initial state on mount", async () => {
    const { result } = renderHook(() => useAutoConfirmState(), sharedConfig);

    expect(result.current.isLoading).toBe(true);
    expect(result.current.status).toBe(null);
    expect(result.current.supportedChains).toBe(null);

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.status).toEqual({
      enabled: true,
      chains: ["solana:101" as NetworkID],
    });
    expect(result.current.supportedChains).toEqual(["solana:101" as NetworkID, "eip155:1" as NetworkID]);
    expect(result.current.error).toBe(null);
  });

  it("should handle fetch errors", async () => {
    const error = new Error("Failed to fetch");
    mockAutoConfirmPlugin.autoConfirmStatus.mockRejectedValue(error);

    const { result } = renderHook(() => useAutoConfirmState(), sharedConfig);

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.error).toEqual(error);
    expect(result.current.status).toBe(null);
    expect(result.current.supportedChains).toBe(null);
  });

  it("should update state when custom event is dispatched", async () => {
    const { result } = renderHook(() => useAutoConfirmState(), sharedConfig);

    // Wait for initial load to complete
    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.status?.enabled).toBe(true);

    // Change the mock return value
    mockAutoConfirmPlugin.autoConfirmStatus.mockResolvedValue({
      enabled: false,
      chains: [],
    });

    // Dispatch the custom event and verify loading state doesn't become true
    act(() => {
      window.dispatchEvent(new CustomEvent("phantomAutoConfirmStateChanged"));
    });

    // Verify that isLoading remains false during the update
    expect(result.current.isLoading).toBe(false);

    // Wait for the state to update
    await waitFor(() => {
      expect(result.current.status?.enabled).toBe(false);
    });

    // Verify loading state is still false after update
    expect(result.current.isLoading).toBe(false);
  });

  it("should handle phantom not being ready", () => {
    const spy = jest.spyOn(PhantomContext, "usePhantom").mockReturnValue({ 
      phantom: undefined, 
      isReady: false 
    });

    const { result } = renderHook(() => useAutoConfirmState(), sharedConfig);

    expect(result.current.isLoading).toBe(true);
    expect(result.current.status).toBe(null);
    expect(result.current.supportedChains).toBe(null);
    expect(result.current.error).toBe(null);

    spy.mockRestore();
  });

  it("should clean up event listener on unmount", () => {
    const removeEventListenerSpy = jest.spyOn(window, "removeEventListener");
    const { unmount } = renderHook(() => useAutoConfirmState(), sharedConfig);

    unmount();

    expect(removeEventListenerSpy).toHaveBeenCalledWith(
      "phantomAutoConfirmStateChanged",
      expect.any(Function)
    );

    removeEventListenerSpy.mockRestore();
  });

  it("should only show loading state on initial load, not on subsequent updates", async () => {
    const { result } = renderHook(() => useAutoConfirmState(), sharedConfig);

    // Initial load should show loading state
    expect(result.current.isLoading).toBe(true);

    // Wait for initial load to complete
    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    // Verify initial data is loaded
    expect(result.current.status?.enabled).toBe(true);

    // Change the mock return value for subsequent update
    mockAutoConfirmPlugin.autoConfirmStatus.mockResolvedValue({
      enabled: false,
      chains: [],
    });

    // Trigger a state update
    act(() => {
      window.dispatchEvent(new CustomEvent("phantomAutoConfirmStateChanged"));
    });

    // Verify loading state remains false during subsequent update
    expect(result.current.isLoading).toBe(false);

    // Wait for the update to complete
    await waitFor(() => {
      expect(result.current.status?.enabled).toBe(false);
    });

    // Verify loading state is still false after update
    expect(result.current.isLoading).toBe(false);
  });
});