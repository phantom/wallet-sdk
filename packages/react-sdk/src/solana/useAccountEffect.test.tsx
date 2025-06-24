import { act, renderHook } from "@testing-library/react";
import * as React from "react";
import { PhantomProvider } from "../PhantomContext";
import { useAccountEffect } from "./useAccountEffect";

const MOCK_PUBLIC_KEY = "11111111111111111111111111111111";
const MOCK_PUBLIC_KEY_2 = "22222222222222222222222222222222";

const mockSolanaPlugin = {
  addEventListener: jest.fn(),
  removeEventListener: jest.fn(),
};

const mockCreateSolanaPlugin = () => {
  return {
    name: "solana",
    create: () => mockSolanaPlugin,
  };
};

const sharedConfig = {
  wrapper: ({ children }: { children: React.ReactNode }) => (
    <PhantomProvider
      config={{
        plugins: [mockCreateSolanaPlugin()],
      }}
    >
      {children}
    </PhantomProvider>
  ),
};

describe("useAccountEffect", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("should set up event listeners on mount", () => {
    const onConnect = jest.fn();
    const onDisconnect = jest.fn();
    const onAccountChanged = jest.fn();

    renderHook(
      () =>
        useAccountEffect({
          onConnect,
          onDisconnect,
          onAccountChanged,
        }),
      sharedConfig,
    );

    expect(mockSolanaPlugin.addEventListener).toHaveBeenCalledWith("connect", expect.any(Function));
    expect(mockSolanaPlugin.addEventListener).toHaveBeenCalledWith("disconnect", expect.any(Function));
    expect(mockSolanaPlugin.addEventListener).toHaveBeenCalledWith("accountChanged", expect.any(Function));
  });

  it("should clean up event listeners on unmount", () => {
    const onConnect = jest.fn();
    const onDisconnect = jest.fn();
    const onAccountChanged = jest.fn();

    const { unmount } = renderHook(
      () =>
        useAccountEffect({
          onConnect,
          onDisconnect,
          onAccountChanged,
        }),
      sharedConfig,
    );

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

  it("should call onConnect when account connects", () => {
    const onConnect = jest.fn();
    const onDisconnect = jest.fn();
    const onAccountChanged = jest.fn();

    renderHook(
      () =>
        useAccountEffect({
          onConnect,
          onDisconnect,
          onAccountChanged,
        }),
      sharedConfig,
    );

    act(() => {
      const connectHandler = mockSolanaPlugin.addEventListener.mock.calls.find(
        (call: any) => call[0] === "connect",
      )?.[1];
      if (connectHandler) {
        connectHandler(MOCK_PUBLIC_KEY);
      }
    });

    expect(onConnect).toHaveBeenCalledWith({
      publicKey: MOCK_PUBLIC_KEY,
    });
    expect(onDisconnect).not.toHaveBeenCalled();
    expect(onAccountChanged).not.toHaveBeenCalled();
  });

  it("should call onDisconnect when account disconnects", () => {
    const onConnect = jest.fn();
    const onDisconnect = jest.fn();
    const onAccountChanged = jest.fn();

    renderHook(
      () =>
        useAccountEffect({
          onConnect,
          onDisconnect,
          onAccountChanged,
        }),
      sharedConfig,
    );

    act(() => {
      const disconnectHandler = mockSolanaPlugin.addEventListener.mock.calls.find(
        (call: any) => call[0] === "disconnect",
      )?.[1];
      if (disconnectHandler) {
        disconnectHandler();
      }
    });

    expect(onDisconnect).toHaveBeenCalled();
    expect(onConnect).not.toHaveBeenCalled();
    expect(onAccountChanged).not.toHaveBeenCalled();
  });

  it("should call onAccountChanged when account changes", () => {
    const onConnect = jest.fn();
    const onDisconnect = jest.fn();
    const onAccountChanged = jest.fn();

    renderHook(
      () =>
        useAccountEffect({
          onConnect,
          onDisconnect,
          onAccountChanged,
        }),
      sharedConfig,
    );

    act(() => {
      const accountChangedHandler = mockSolanaPlugin.addEventListener.mock.calls.find(
        (call: any) => call[0] === "accountChanged",
      )?.[1];
      if (accountChangedHandler) {
        accountChangedHandler(MOCK_PUBLIC_KEY_2);
      }
    });

    expect(onAccountChanged).toHaveBeenCalledWith({
      publicKey: MOCK_PUBLIC_KEY_2,
    });
    expect(onConnect).not.toHaveBeenCalled();
    expect(onDisconnect).not.toHaveBeenCalled();
  });

  it("should work without any callback parameters", () => {
    expect(() => {
      renderHook(() => useAccountEffect(), sharedConfig);
    }).not.toThrow();

    expect(() => {
      renderHook(() => useAccountEffect({}), sharedConfig);
    }).not.toThrow();
  });

  it("should handle multiple event calls correctly", () => {
    const onConnect = jest.fn();
    const onDisconnect = jest.fn();
    const onAccountChanged = jest.fn();

    renderHook(
      () =>
        useAccountEffect({
          onConnect,
          onDisconnect,
          onAccountChanged,
        }),
      sharedConfig,
    );

    const connectHandler = mockSolanaPlugin.addEventListener.mock.calls.find((call: any) => call[0] === "connect")?.[1];
    const disconnectHandler = mockSolanaPlugin.addEventListener.mock.calls.find(
      (call: any) => call[0] === "disconnect",
    )?.[1];
    const accountChangedHandler = mockSolanaPlugin.addEventListener.mock.calls.find(
      (call: any) => call[0] === "accountChanged",
    )?.[1];

    act(() => {
      connectHandler?.(MOCK_PUBLIC_KEY);
      accountChangedHandler?.(MOCK_PUBLIC_KEY_2);
      disconnectHandler?.();
    });

    expect(onConnect).toHaveBeenCalledWith({ publicKey: MOCK_PUBLIC_KEY });
    expect(onAccountChanged).toHaveBeenCalledWith({ publicKey: MOCK_PUBLIC_KEY_2 });
    expect(onDisconnect).toHaveBeenCalled();
  });
});
