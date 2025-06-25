import * as React from "react";
import { renderHook } from "@testing-library/react";
import { useConnect } from "./useConnect";

import { createSolanaPlugin } from "@phantom/browser-sdk/solana";
import { PhantomProvider } from "../PhantomContext";

const sharedConfig = {
  wrapper: ({ children }: { children: React.ReactNode }) => (
    <PhantomProvider config={{ plugins: [createSolanaPlugin()] }}>{children}</PhantomProvider>
  ),
};

describe("useConnect", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("should throw error when solana plugin is not properly configured", async () => {
    const { result } = renderHook(() => useConnect(), {
      wrapper: ({ children }) => <PhantomProvider config={{}}>{children}</PhantomProvider>,
    });

    await expect(result.current.connect()).rejects.toThrow("Phantom solana plugin not found.");
  });

  it("should throw error when phantom provider is not available", async () => {
    const { result } = renderHook(() => useConnect(), sharedConfig);

    await expect(result.current.connect()).rejects.toThrow("Provider not found.");
  });

  it("should successfully connect when phantom.solana is available", async () => {
    // @ts-expect-error - window.phantom is not typed
    window.phantom = {
      solana: {
        connect: jest.fn().mockResolvedValue({ publicKey: { toString: () => "123" } }),
      },
    };

    const { result } = renderHook(() => useConnect(), sharedConfig);

    await result.current.connect();

    // @ts-expect-error - window.phantom is not typed
    expect(window.phantom.solana.connect).toHaveBeenCalled();
  });

  it("should automatically connect when autoConnect is true", async () => {
    // @ts-expect-error - window.phantom is not typed
    window.phantom = {
      solana: {
        connect: jest.fn().mockResolvedValue({ publicKey: { toString: () => "123" } }),
      },
    };

    renderHook(() => useConnect({ autoConnect: true }), sharedConfig);

    // wait for 100ms
    await new Promise(resolve => setTimeout(resolve, 100));

    // @ts-expect-error - window.phantom is not typed
    expect(window.phantom.solana.connect).toHaveBeenCalled();
  });

  it("should not automatically connect when autoConnect is false", async () => {
    // @ts-expect-error - window.phantom is not typed
    window.phantom = {
      solana: {
        connect: jest.fn().mockResolvedValue({ publicKey: { toString: () => "123" } }),
      },
    };

    renderHook(() => useConnect({ autoConnect: false }), sharedConfig);

    // wait for 100ms
    await new Promise(resolve => setTimeout(resolve, 100));

    // @ts-expect-error - window.phantom is not typed
    expect(window.phantom.solana.connect).not.toHaveBeenCalled();
  });
});
