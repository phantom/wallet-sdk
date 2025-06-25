import * as React from "react";
import { renderHook } from "@testing-library/react";
import { useDisconnect } from "./useDisconnect";

import { createSolanaPlugin } from "@phantom/browser-sdk/solana";
import { PhantomProvider } from "../PhantomContext";

const sharedConfig = {
  wrapper: ({ children }: { children: React.ReactNode }) => (
    <PhantomProvider config={{ plugins: [createSolanaPlugin()] }}>{children}</PhantomProvider>
  ),
};

describe("useDisconnect", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("should throw error when solana plugin is not properly configured", async () => {
    const { result } = renderHook(() => useDisconnect(), {
      wrapper: ({ children }) => <PhantomProvider config={{}}>{children}</PhantomProvider>,
    });

    await expect(result.current.disconnect()).rejects.toThrow("Phantom solana disconnect method not found.");
  });

  it("should throw error when phantom provider is not available", async () => {
    const { result } = renderHook(() => useDisconnect(), sharedConfig);

    await expect(result.current.disconnect()).rejects.toThrow("Provider not found.");
  });

  it("should successfully disconnect when phantom.solana is available", async () => {
    // @ts-expect-error - window.phantom is not typed
    window.phantom = {
      solana: {
        disconnect: jest.fn().mockResolvedValue(undefined),
      },
    };

    const { result } = renderHook(() => useDisconnect(), sharedConfig);

    await result.current.disconnect();

    // @ts-expect-error - window.phantom is not typed
    expect(window.phantom.solana.disconnect).toHaveBeenCalled();
  });
});
