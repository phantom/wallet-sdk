import { onConnect, triggerConnectCallbacks, clearAllConnectCallbacks } from "./onConnect";

describe("onConnect", () => {
  beforeEach(() => {
    clearAllConnectCallbacks();
  });

  it("should register and trigger a single callback", () => {
    const mockCallback = jest.fn();
    onConnect(mockCallback);
    triggerConnectCallbacks("publicKey123");
    expect(mockCallback).toHaveBeenCalledWith("publicKey123");
    expect(mockCallback).toHaveBeenCalledTimes(1);
  });

  it("should register and trigger multiple callbacks", () => {
    const mockCallback1 = jest.fn();
    const mockCallback2 = jest.fn();
    onConnect(mockCallback1);
    onConnect(mockCallback2);
    triggerConnectCallbacks("publicKey456");
    expect(mockCallback1).toHaveBeenCalledWith("publicKey456");
    expect(mockCallback1).toHaveBeenCalledTimes(1);
    expect(mockCallback2).toHaveBeenCalledWith("publicKey456");
    expect(mockCallback2).toHaveBeenCalledTimes(1);
  });

  it("should allow removing a callback", () => {
    const mockCallback1 = jest.fn();
    const mockCallback2 = jest.fn();
    const clearCallback1 = onConnect(mockCallback1);
    onConnect(mockCallback2);

    clearCallback1(); // Remove the first callback

    triggerConnectCallbacks("publicKey789");
    expect(mockCallback1).not.toHaveBeenCalled();
    expect(mockCallback2).toHaveBeenCalledWith("publicKey789");
    expect(mockCallback2).toHaveBeenCalledTimes(1);
  });

  it("should clear all callbacks", () => {
    const mockCallback1 = jest.fn();
    const mockCallback2 = jest.fn();
    onConnect(mockCallback1);
    onConnect(mockCallback2);

    clearAllConnectCallbacks();

    triggerConnectCallbacks("publicKeyABC");
    expect(mockCallback1).not.toHaveBeenCalled();
    expect(mockCallback2).not.toHaveBeenCalled();
  });

  it("should not throw if triggering with no callbacks registered", () => {
    expect(() => triggerConnectCallbacks("publicKeyDEF")).not.toThrow();
  });
});
