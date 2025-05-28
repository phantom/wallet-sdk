import { onDisconnect, triggerDisconnectCallbacks, clearAllDisconnectCallbacks } from "./onDisconnect";

describe("onDisconnect", () => {
  beforeEach(() => {
    clearAllDisconnectCallbacks();
  });

  it("should register and trigger a single callback", () => {
    const mockCallback = jest.fn();
    onDisconnect(mockCallback);
    triggerDisconnectCallbacks();
    expect(mockCallback).toHaveBeenCalledTimes(1);
  });

  it("should register and trigger multiple callbacks", () => {
    const mockCallback1 = jest.fn();
    const mockCallback2 = jest.fn();
    onDisconnect(mockCallback1);
    onDisconnect(mockCallback2);
    triggerDisconnectCallbacks();
    expect(mockCallback1).toHaveBeenCalledTimes(1);
    expect(mockCallback2).toHaveBeenCalledTimes(1);
  });

  it("should allow removing a callback", () => {
    const mockCallback1 = jest.fn();
    const mockCallback2 = jest.fn();
    const clearCallback1 = onDisconnect(mockCallback1);
    onDisconnect(mockCallback2);

    clearCallback1(); // Remove the first callback

    triggerDisconnectCallbacks();
    expect(mockCallback1).not.toHaveBeenCalled();
    expect(mockCallback2).toHaveBeenCalledTimes(1);
  });

  it("should clear all callbacks", () => {
    const mockCallback1 = jest.fn();
    const mockCallback2 = jest.fn();
    onDisconnect(mockCallback1);
    onDisconnect(mockCallback2);

    clearAllDisconnectCallbacks();

    triggerDisconnectCallbacks();
    expect(mockCallback1).not.toHaveBeenCalled();
    expect(mockCallback2).not.toHaveBeenCalled();
  });

  it("should not throw if triggering with no callbacks registered", () => {
    expect(() => triggerDisconnectCallbacks()).not.toThrow();
  });
});
