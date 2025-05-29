import { act, renderHook, waitFor } from "@testing-library/react";
import { useProvider } from "./useProvider";

import { createSolanaPlugin } from "@phantom/browser-sdk/solana";
import { PhantomProvider } from "../PhantomContext";

const sharedConfig = {
  wrapper: ({ children }: { children: React.ReactNode }) => (
    <PhantomProvider config={{ chainPlugins: [createSolanaPlugin()] }}>{children}</PhantomProvider>
  ),
};

describe("useProvider", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it("should return loading status when phantom is not ready", () => {
    const { result } = renderHook(() => useProvider(), sharedConfig);

    expect(result.current).toEqual({
      status: "loading",
      provider: null,
    });
  });

  it("should return error status after retries when provider is not available", async () => {
    jest.useFakeTimers();
    const { result } = renderHook(() => useProvider(), sharedConfig);

    expect(result.current).toEqual({
      status: "loading",
      provider: null,
    });

    act(() => {
      jest.advanceTimersByTime(20000);
    });

    await waitFor(() => {
      expect(result.current).toEqual({
        status: "error",
        provider: null,
      });
    });

    jest.useRealTimers();
  });

  it("should return success status when provider is available", async () => {
    const mockProvider = { connect: jest.fn() };
    // @ts-expect-error - window.phantom is not typed
    window.phantom = {
      solana: mockProvider,
    };

    const { result } = renderHook(() => useProvider(), sharedConfig);

    await waitFor(() => {
      expect(result.current).toEqual({
        status: "success",
        provider: mockProvider,
      });
    });
  });
});
