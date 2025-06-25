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
  autoConfirmStatus: jest.fn(),
  autoConfirmSupportedChains: jest.fn(),
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
    mockAutoConfirmPlugin.autoConfirmStatus.mockResolvedValue({ enabled: false, chains: [] });
    mockAutoConfirmPlugin.autoConfirmSupportedChains.mockResolvedValue({ chains: ["solana:101", "solana:102"] });
  });

  it("should provide enable, disable, getStatus, and getSupportedChains functions", () => {
    const { result } = renderHook(() => useAutoConfirmActions(), sharedConfig);

    expect(typeof result.current.enable).toBe("function");
    expect(typeof result.current.disable).toBe("function");
    expect(typeof result.current.getStatus).toBe("function");
    expect(typeof result.current.getSupportedChains).toBe("function");
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

    expect(dispatchEventSpy).toHaveBeenCalledWith(new CustomEvent("phantomAutoConfirmStateChanged"));

    dispatchEventSpy.mockRestore();
  });

  it("should dispatch state change event after disable", async () => {
    const dispatchEventSpy = jest.spyOn(window, "dispatchEvent");
    const { result } = renderHook(() => useAutoConfirmActions(), sharedConfig);

    await act(async () => {
      await result.current.disable();
    });

    expect(dispatchEventSpy).toHaveBeenCalledWith(new CustomEvent("phantomAutoConfirmStateChanged"));

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
      "Phantom auto-confirm plugin not found. Please ensure the auto-confirm plugin is installed and configured properly.",
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

  it("should call autoConfirmStatus and return status", async () => {
    const mockStatus = { enabled: true, chains: ["solana:101" as NetworkID] };
    mockAutoConfirmPlugin.autoConfirmStatus.mockResolvedValue(mockStatus);

    const { result } = renderHook(() => useAutoConfirmActions(), sharedConfig);

    await act(async () => {
      const status = await result.current.getStatus();
      expect(status).toEqual(mockStatus);
    });

    expect(mockAutoConfirmPlugin.autoConfirmStatus).toHaveBeenCalled();
  });

  it("should call autoConfirmSupportedChains and return supported chains", async () => {
    const mockSupportedChains = { chains: ["solana:101" as NetworkID, "solana:102" as NetworkID] };
    mockAutoConfirmPlugin.autoConfirmSupportedChains.mockResolvedValue(mockSupportedChains);

    const { result } = renderHook(() => useAutoConfirmActions(), sharedConfig);

    await act(async () => {
      const supportedChains = await result.current.getSupportedChains();
      expect(supportedChains).toEqual(mockSupportedChains);
    });

    expect(mockAutoConfirmPlugin.autoConfirmSupportedChains).toHaveBeenCalled();
  });

  it("should throw error when phantom is not ready for getStatus", async () => {
    const spy = jest.spyOn(PhantomContext, "usePhantom").mockReturnValue({
      phantom: undefined,
      isReady: false,
    });

    const { result } = renderHook(() => useAutoConfirmActions(), sharedConfig);

    await expect(result.current.getStatus()).rejects.toThrow("Phantom is not ready");

    spy.mockRestore();
  });

  it("should throw error when phantom is not ready for getSupportedChains", async () => {
    const spy = jest.spyOn(PhantomContext, "usePhantom").mockReturnValue({
      phantom: undefined,
      isReady: false,
    });

    const { result } = renderHook(() => useAutoConfirmActions(), sharedConfig);

    await expect(result.current.getSupportedChains()).rejects.toThrow("Phantom is not ready");

    spy.mockRestore();
  });

  it("should throw error when auto-confirm plugin is not configured for getStatus", async () => {
    const spy = jest.spyOn(PhantomContext, "usePhantom").mockReturnValue({
      phantom: {} as any,
      isReady: true,
    });

    const { result } = renderHook(() => useAutoConfirmActions(), sharedConfig);

    await expect(result.current.getStatus()).rejects.toThrow(
      "Phantom auto-confirm plugin not found. Please ensure the auto-confirm plugin is installed and configured properly.",
    );

    spy.mockRestore();
  });

  it("should throw error when auto-confirm plugin is not configured for getSupportedChains", async () => {
    const spy = jest.spyOn(PhantomContext, "usePhantom").mockReturnValue({
      phantom: {} as any,
      isReady: true,
    });

    const { result } = renderHook(() => useAutoConfirmActions(), sharedConfig);

    await expect(result.current.getSupportedChains()).rejects.toThrow(
      "Phantom auto-confirm plugin not found. Please ensure the auto-confirm plugin is installed and configured properly.",
    );

    spy.mockRestore();
  });

  it("should propagate errors from autoConfirmStatus", async () => {
    const error = new Error("Status fetch failed");
    mockAutoConfirmPlugin.autoConfirmStatus.mockRejectedValue(error);

    const { result } = renderHook(() => useAutoConfirmActions(), sharedConfig);

    await expect(result.current.getStatus()).rejects.toThrow("Status fetch failed");
  });

  it("should propagate errors from autoConfirmSupportedChains", async () => {
    const error = new Error("Supported chains fetch failed");
    mockAutoConfirmPlugin.autoConfirmSupportedChains.mockRejectedValue(error);

    const { result } = renderHook(() => useAutoConfirmActions(), sharedConfig);

    await expect(result.current.getSupportedChains()).rejects.toThrow("Supported chains fetch failed");
  });
});
