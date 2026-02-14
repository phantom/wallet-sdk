import { renderHook, act } from "@testing-library/react";
import { useIsExtensionInstalled } from "./useIsExtensionInstalled";
import { waitForPhantomExtension } from "@phantom/browser-sdk";

jest.mock("@phantom/browser-sdk", () => ({
  waitForPhantomExtension: jest.fn(),
}));

const mockWaitForPhantomExtension = waitForPhantomExtension as jest.Mock;

describe("useIsExtensionInstalled", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("sets installed state when extension is available", async () => {
    mockWaitForPhantomExtension.mockResolvedValue(true);

    const { result } = renderHook(() => useIsExtensionInstalled());

    expect(result.current.isLoading).toBe(true);
    expect(result.current.isInstalled).toBe(false);

    await act(async () => {
      await Promise.resolve();
    });

    expect(mockWaitForPhantomExtension).toHaveBeenCalledWith(3000);
    expect(result.current.isLoading).toBe(false);
    expect(result.current.isInstalled).toBe(true);
  });

  it("sets installed false when extension is unavailable", async () => {
    mockWaitForPhantomExtension.mockResolvedValue(false);

    const { result } = renderHook(() => useIsExtensionInstalled());

    await act(async () => {
      await Promise.resolve();
    });

    expect(result.current.isLoading).toBe(false);
    expect(result.current.isInstalled).toBe(false);
  });

  it("handles errors by setting installed false", async () => {
    mockWaitForPhantomExtension.mockRejectedValue(new Error("boom"));

    const { result } = renderHook(() => useIsExtensionInstalled());

    await act(async () => {
      await Promise.resolve();
    });

    expect(result.current.isLoading).toBe(false);
    expect(result.current.isInstalled).toBe(false);
  });
});
