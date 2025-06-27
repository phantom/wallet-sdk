import { createAutoConfirmPlugin } from "@phantom/browser-sdk/auto-confirm";
import { act, renderHook } from "@testing-library/react";
import * as React from "react";
import { PhantomProvider } from "../PhantomContext";
import { useAutoConfirmActions } from "./useAutoConfirmActions";
import type { NetworkID } from "./types";
import * as PhantomContext from "../PhantomContext";

const mockAutoConfirmPlugin = {
  ...createAutoConfirmPlugin().create(),
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

describe("useAutoConfirmActions", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockAutoConfirmPlugin.autoConfirmEnable.mockResolvedValue(undefined);
    mockAutoConfirmPlugin.autoConfirmDisable.mockResolvedValue(undefined);
  });

  it("should provide enable and disable functions", () => {
    const { result } = renderHook(() => useAutoConfirmActions(), sharedConfig);

    expect(typeof result.current.enable).toBe("function");
    expect(typeof result.current.disable).toBe("function");
  });

  it("should call autoConfirmEnable with params", async () => {
    const { result } = renderHook(() => useAutoConfirmActions(), sharedConfig);

    const params = { chains: ["solana:101" as NetworkID] };
    await act(async () => {
      await result.current.enable(params);
    });

    expect(mockAutoConfirmPlugin.autoConfirmEnable).toHaveBeenCalledWith(params);
  });

  it("should call autoConfirmEnable without params", async () => {
    const { result } = renderHook(() => useAutoConfirmActions(), sharedConfig);

    await act(async () => {
      await result.current.enable();
    });

    expect(mockAutoConfirmPlugin.autoConfirmEnable).toHaveBeenCalledWith(undefined);
  });

  it("should call autoConfirmDisable", async () => {
    const { result } = renderHook(() => useAutoConfirmActions(), sharedConfig);

    await act(async () => {
      await result.current.disable();
    });

    expect(mockAutoConfirmPlugin.autoConfirmDisable).toHaveBeenCalled();
  });

  it("should dispatch state change event after enable", async () => {
    const dispatchEventSpy = jest.spyOn(window, "dispatchEvent");
    const { result } = renderHook(() => useAutoConfirmActions(), sharedConfig);

    await act(async () => {
      await result.current.enable({ chains: ["solana:101" as NetworkID] });
    });

    expect(dispatchEventSpy).toHaveBeenCalledWith(
      new CustomEvent("phantomAutoConfirmStateChanged")
    );

    dispatchEventSpy.mockRestore();
  });

  it("should dispatch state change event after disable", async () => {
    const dispatchEventSpy = jest.spyOn(window, "dispatchEvent");
    const { result } = renderHook(() => useAutoConfirmActions(), sharedConfig);

    await act(async () => {
      await result.current.disable();
    });

    expect(dispatchEventSpy).toHaveBeenCalledWith(
      new CustomEvent("phantomAutoConfirmStateChanged")
    );

    dispatchEventSpy.mockRestore();
  });

  it("should throw error when phantom is not ready", async () => {
    const spy = jest.spyOn(PhantomContext, "usePhantom").mockReturnValue({
      phantom: undefined,
      isReady: false,
    });

    const { result } = renderHook(() => useAutoConfirmActions(), sharedConfig);

    await expect(result.current.enable()).rejects.toThrow("Phantom is not ready");
    await expect(result.current.disable()).rejects.toThrow("Phantom is not ready");

    spy.mockRestore();
  });

  it("should throw error when auto-confirm plugin is not configured", async () => {
    const spy = jest.spyOn(PhantomContext, "usePhantom").mockReturnValue({
      phantom: {} as any,
      isReady: true,
    });

    const { result } = renderHook(() => useAutoConfirmActions(), sharedConfig);

    await expect(result.current.enable()).rejects.toThrow(
      "Phantom auto-confirm plugin not found. Please ensure the auto-confirm plugin is installed and configured properly."
    );

    spy.mockRestore();
  });

  it("should propagate errors from autoConfirmEnable", async () => {
    const error = new Error("Enable failed");
    mockAutoConfirmPlugin.autoConfirmEnable.mockRejectedValue(error);

    const { result } = renderHook(() => useAutoConfirmActions(), sharedConfig);

    await expect(result.current.enable()).rejects.toThrow("Enable failed");
  });

  it("should propagate errors from autoConfirmDisable", async () => {
    const error = new Error("Disable failed");
    mockAutoConfirmPlugin.autoConfirmDisable.mockRejectedValue(error);

    const { result } = renderHook(() => useAutoConfirmActions(), sharedConfig);

    await expect(result.current.disable()).rejects.toThrow("Disable failed");
  });
});