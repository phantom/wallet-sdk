import { createSolanaPlugin } from "@phantom/browser-sdk/solana";
import { act, renderHook, waitFor } from "@testing-library/react";
import * as React from "react";
import { PhantomProvider } from "../PhantomContext";
import { useAccount } from "./useAccount";
import * as PhantomContext from "../PhantomContext";

const MOCK_PUBLIC_KEY = "11111111111111111111111111111111";

const mockSolanaPlugin = {
  ...createSolanaPlugin().create(),
  addEventListener: jest.fn(),
  removeEventListener: jest.fn(),
};

const createPlugin = {
  name: "solana",
  create: () => {
    return mockSolanaPlugin;
  },
};

const sharedConfig = {
  wrapper: ({ children }: { children: React.ReactNode }) => (
    <PhantomProvider
      config={{
        chainPlugins: [createPlugin],
      }}
    >
      {children}
    </PhantomProvider>
  ),
};

describe("useAccount", () => {
  afterEach(() => {
    delete (window as any).phantom;
  });

  beforeEach(() => {
    jest.clearAllMocks();
    (window as any).phantom = {
      solana: {
        isConnected: true,
        publicKey: { toString: () => MOCK_PUBLIC_KEY },
        on: jest.fn(),
        off: jest.fn(),
        removeListener: jest.fn(),
      },
    };
  });

  it("should return publicKey when account is connected", async () => {
    const { result } = renderHook(() => useAccount(), sharedConfig);

    await waitFor(() => {
      expect(result.current).toBe(MOCK_PUBLIC_KEY);
    });
  });

  it("should return undefined when account is disconnected", async () => {
    (window as any).phantom.solana.isConnected = false;
    (window as any).phantom.solana.publicKey = null;

    const { result } = renderHook(() => useAccount(), sharedConfig);

    await waitFor(() => {
      expect(result.current).toBe(undefined);
    });
  });

  it("should automatically update state when account connects", async () => {
    (window as any).phantom.solana.isConnected = false;
    (window as any).phantom.solana.publicKey = null;

    const { result } = renderHook(() => useAccount(), sharedConfig);

    await waitFor(() => {
      expect(result.current).toBe(undefined);
    });

    (window as any).phantom.solana.isConnected = true;
    (window as any).phantom.solana.publicKey = { toString: () => MOCK_PUBLIC_KEY };
    act(() => {
      const connectHandler = mockSolanaPlugin.addEventListener.mock.calls.find(
        (call: any) => call[0] === "connect",
      )?.[1];
      if (connectHandler) {
        connectHandler();
      }
    });

    await waitFor(() => {
      expect(result.current).toBe(MOCK_PUBLIC_KEY);
    });
  });

  it("should automatically update state when account disconnects", async () => {
    (window as any).phantom.solana.isConnected = true;
    (window as any).phantom.solana.publicKey = { toString: () => MOCK_PUBLIC_KEY };

    const { result } = renderHook(() => useAccount(), sharedConfig);

    await waitFor(() => {
      expect(result.current).toBe(MOCK_PUBLIC_KEY);
    });

    (window as any).phantom.solana.isConnected = false;
    (window as any).phantom.solana.publicKey = null;
    act(() => {
      const disconnectHandler = mockSolanaPlugin.addEventListener.mock.calls.find(
        (call: any) => call[0] === "disconnect",
      )?.[1];
      if (disconnectHandler) {
        disconnectHandler();
      }
    });

    await waitFor(() => {
      expect(result.current).toBe(undefined);
    });
  });

  it("should set up event listeners on mount", () => {
    renderHook(() => useAccount(), sharedConfig);

    expect(mockSolanaPlugin.addEventListener).toHaveBeenCalledWith("connect", expect.any(Function));
    expect(mockSolanaPlugin.addEventListener).toHaveBeenCalledWith("disconnect", expect.any(Function));
    expect(mockSolanaPlugin.addEventListener).toHaveBeenCalledWith("accountChanged", expect.any(Function));
  });

  it("should clean up event listeners on unmount", () => {
    const { unmount } = renderHook(() => useAccount(), sharedConfig);

    const connectHandler = mockSolanaPlugin.addEventListener.mock.calls.find((call: any) => call[0] === "connect")?.[1];
    const disconnectHandler = mockSolanaPlugin.addEventListener.mock.calls.find(
      (call: any) => call[0] === "disconnect",
    )?.[1];
    const accountChangedHandler = mockSolanaPlugin.addEventListener.mock.calls.find(
      (call: any) => call[0] === "accountChanged",
    )?.[1];

    unmount();

    expect(mockSolanaPlugin.removeEventListener).toHaveBeenCalledWith("connect", connectHandler);
    expect(mockSolanaPlugin.removeEventListener).toHaveBeenCalledWith("disconnect", disconnectHandler);
    expect(mockSolanaPlugin.removeEventListener).toHaveBeenCalledWith("accountChanged", accountChangedHandler);
  });

  it("should handle account changes", async () => {
    (window as any).phantom.solana.isConnected = true;
    (window as any).phantom.solana.publicKey = { toString: () => MOCK_PUBLIC_KEY };

    const { result } = renderHook(() => useAccount(), sharedConfig);

    await waitFor(() => {
      expect(result.current).toBe(MOCK_PUBLIC_KEY);
    });

    const newPublicKey = "22222222222222222222222222222223";
    (window as any).phantom.solana.publicKey = { toString: () => newPublicKey };
    act(() => {
      const accountChangedHandler = mockSolanaPlugin.addEventListener.mock.calls.find(
        (call: any) => call[0] === "accountChanged",
      )?.[1];
      if (accountChangedHandler) {
        accountChangedHandler();
      }
    });

    await waitFor(() => {
      expect(result.current).toBe(newPublicKey);
    });

    (window as any).phantom.solana.publicKey = { toString: () => MOCK_PUBLIC_KEY };
  });

  it("should handle provider not being available initially", () => {
    const originalPhantom = { ...(window as any).phantom };
    (window as any).phantom = undefined;

    const { result } = renderHook(() => useAccount(), sharedConfig);

    expect(result.current).toBe(undefined);

    (window as any).phantom = originalPhantom;
  });

  it("should return loading state when phantom context is not yet initialized", () => {
    const spy = jest.spyOn(PhantomContext, "usePhantom").mockReturnValue({ phantom: undefined, isReady: false });
    const { result } = renderHook(() => useAccount(), sharedConfig);

    expect(result.current).toBe(undefined);

    spy.mockRestore();
  });

  it("should transition from loading to connected when phantom context becomes ready", async () => {
    const spy = jest.spyOn(PhantomContext, "usePhantom");
    spy.mockReturnValue({ phantom: undefined, isReady: false });

    const { result, rerender } = renderHook(() => useAccount(), sharedConfig);

    expect(result.current).toBe(undefined);

    spy.mockReturnValue({
      phantom: {
        solana: {
          getAccount: () => Promise.resolve(MOCK_PUBLIC_KEY),
          addEventListener: jest.fn(),
          removeEventListener: jest.fn(),
        },
      } as any,
      isReady: true,
    });

    rerender();

    await waitFor(() => {
      expect(result.current).toBe(MOCK_PUBLIC_KEY);
    });

    spy.mockRestore();
  });
});
