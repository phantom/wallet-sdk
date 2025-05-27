import * as React from "react";
import { renderHook } from "@testing-library/react";
import { useConnect } from "./useConnect";

import { createSolanaPlugin } from "@phantom/browser-sdk/solana";
import { PhantomProvider } from "../PhantomContext";

const sharedConfig = {
  wrapper: ({ children }: { children: React.ReactNode }) => (
    <PhantomProvider config={{ chainPlugins: [createSolanaPlugin()] }}>{children}</PhantomProvider>
  ),
};

describe("useConnect", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("should throw error when solana chain plugin is not properly configured", async () => {
    const { result } = renderHook(() => useConnect(), {
      wrapper: ({ children }) => <PhantomProvider config={{}}>{children}</PhantomProvider>,
    });

    await expect(result.current()).rejects.toThrow("Phantom solana plugin not found.");
  });

  it("should throw error when phantom provider is not available", async () => {
    const { result } = renderHook(() => useConnect(), sharedConfig);

    await expect(result.current()).rejects.toThrow("Phantom provider not found.");
  });

  it("should successfully connect when phantom.solana is available", async () => {
    // @ts-expect-error - window.phantom is not typed
    window.phantom = {
      solana: {
        connect: jest.fn().mockResolvedValue({ publicKey: { toString: () => "123" } }),
      },
    };

    const { result } = renderHook(() => useConnect(), sharedConfig);

    await result.current();

    // @ts-expect-error - window.phantom is not typed
    expect(window.phantom.solana.connect).toHaveBeenCalled();
  });
});
