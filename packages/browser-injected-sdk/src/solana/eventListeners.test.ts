import { addEventListener, removeEventListener, triggerEvent, clearAllEventListeners } from "./eventListeners";

describe("eventListeners", () => {
  beforeEach(() => {
    clearAllEventListeners();
  });

  describe("addEventListener", () => {
    it("should register a callback for a given event type", () => {
      const mockCallback = jest.fn();
      addEventListener("connect", mockCallback);
      triggerEvent("connect", "publicKey123");
      expect(mockCallback).toHaveBeenCalledWith("publicKey123");
    });

    it("should return a function to unregister the callback", () => {
      const mockCallback = jest.fn();
      const unregister = addEventListener("disconnect", mockCallback);
      unregister();
      triggerEvent("disconnect");
      expect(mockCallback).not.toHaveBeenCalled();
    });
  });

  describe("removeEventListener", () => {
    it("should remove a registered callback", () => {
      const mockCallback = jest.fn();
      addEventListener("accountChanged", mockCallback);
      removeEventListener("accountChanged", mockCallback);
      triggerEvent("accountChanged", "newPublicKey");
      expect(mockCallback).not.toHaveBeenCalled();
    });

    it("should not throw if trying to remove a non-existent callback", () => {
      const mockCallback = jest.fn();
      expect(() => removeEventListener("connect", mockCallback)).not.toThrow();
    });
  });

  describe("triggerEvent", () => {
    it("should trigger all registered callbacks for a given event type", () => {
      const mockCallback1 = jest.fn();
      const mockCallback2 = jest.fn();
      addEventListener("connect", mockCallback1);
      addEventListener("connect", mockCallback2);
      triggerEvent("connect", "publicKey456");
      expect(mockCallback1).toHaveBeenCalledWith("publicKey456");
      expect(mockCallback2).toHaveBeenCalledWith("publicKey456");
    });

    it("should not trigger callbacks for different event types", () => {
      const connectCallback = jest.fn();
      const disconnectCallback = jest.fn();
      addEventListener("connect", connectCallback);
      addEventListener("disconnect", disconnectCallback);
      triggerEvent("connect", "publicKey789");
      expect(connectCallback).toHaveBeenCalledWith("publicKey789");
      expect(disconnectCallback).not.toHaveBeenCalled();
    });

    it("should pass arguments correctly to callbacks", () => {
      const accountChangedCallback = jest.fn();
      addEventListener("accountChanged", accountChangedCallback);
      triggerEvent("accountChanged", "newAddress");
      expect(accountChangedCallback).toHaveBeenCalledWith("newAddress");
    });

    it("should handle accountChanged with null value", () => {
      const accountChangedCallback = jest.fn();
      addEventListener("accountChanged", accountChangedCallback);
      triggerEvent("accountChanged", null);
      expect(accountChangedCallback).toHaveBeenCalledWith(null);
    });

    it("should handle accountChanged with undefined", () => {
      const accountChangedCallback = jest.fn();
      addEventListener("accountChanged", accountChangedCallback);
      triggerEvent("accountChanged", undefined as any);
      expect(accountChangedCallback).toHaveBeenCalledWith(undefined);
    });

    it("should call connect callback with whatever argument is passed", () => {
      const connectCallback = jest.fn();
      addEventListener("connect", connectCallback);
      triggerEvent("connect", null as any);
      triggerEvent("connect", undefined as any);
      triggerEvent("connect", 123 as any);
      expect(connectCallback).toHaveBeenCalledTimes(3);
      expect(connectCallback).toHaveBeenNthCalledWith(1, null);
      expect(connectCallback).toHaveBeenNthCalledWith(2, undefined);
      expect(connectCallback).toHaveBeenNthCalledWith(3, 123);
    });

    it("should call accountChanged callback with whatever argument is passed", () => {
      const accountChangedCallback = jest.fn();
      addEventListener("accountChanged", accountChangedCallback);
      triggerEvent("accountChanged", 123 as any);
      triggerEvent("accountChanged", {} as any);
      expect(accountChangedCallback).toHaveBeenCalledTimes(2);
      expect(accountChangedCallback).toHaveBeenNthCalledWith(1, 123);
      expect(accountChangedCallback).toHaveBeenNthCalledWith(2, {});
    });

    it("should handle disconnect event correctly with no arguments", () => {
      const disconnectCallback = jest.fn();
      addEventListener("disconnect", disconnectCallback);
      triggerEvent("disconnect");
      expect(disconnectCallback).toHaveBeenCalledTimes(1);
      expect(disconnectCallback).toHaveBeenCalledWith();
    });

    it("should handle multiple callbacks for accountChanged with null", () => {
      const callback1 = jest.fn();
      const callback2 = jest.fn();
      addEventListener("accountChanged", callback1);
      addEventListener("accountChanged", callback2);
      triggerEvent("accountChanged", null);
      expect(callback1).toHaveBeenCalledWith(null);
      expect(callback2).toHaveBeenCalledWith(null);
    });

    it("should handle error in callback gracefully", () => {
      const consoleErrorSpy = jest.spyOn(console, "error").mockImplementation();
      const errorCallback = jest.fn(() => {
        throw new Error("Callback error");
      });
      const normalCallback = jest.fn();
      addEventListener("connect", errorCallback);
      addEventListener("connect", normalCallback);
      triggerEvent("connect", "publicKey123");
      expect(errorCallback).toHaveBeenCalled();
      expect(normalCallback).toHaveBeenCalledWith("publicKey123");
      expect(consoleErrorSpy).toHaveBeenCalledWith("Error in connect event listener:", expect.any(Error));
      consoleErrorSpy.mockRestore();
    });

    it("should handle error in disconnect callback gracefully", () => {
      const consoleErrorSpy = jest.spyOn(console, "error").mockImplementation();
      const errorCallback = jest.fn(() => {
        throw new Error("Disconnect error");
      });
      const normalCallback = jest.fn();
      addEventListener("disconnect", errorCallback);
      addEventListener("disconnect", normalCallback);
      triggerEvent("disconnect");
      expect(errorCallback).toHaveBeenCalled();
      expect(normalCallback).toHaveBeenCalled();
      expect(consoleErrorSpy).toHaveBeenCalledWith("Error in disconnect event listener:", expect.any(Error));
      consoleErrorSpy.mockRestore();
    });

    it("should handle error in accountChanged callback gracefully", () => {
      const consoleErrorSpy = jest.spyOn(console, "error").mockImplementation();
      const errorCallback = jest.fn(() => {
        throw new Error("AccountChanged error");
      });
      const normalCallback = jest.fn();
      addEventListener("accountChanged", errorCallback);
      addEventListener("accountChanged", normalCallback);
      triggerEvent("accountChanged", "newKey");
      expect(errorCallback).toHaveBeenCalled();
      expect(normalCallback).toHaveBeenCalledWith("newKey");
      expect(consoleErrorSpy).toHaveBeenCalledWith("Error in accountChanged event listener:", expect.any(Error));
      consoleErrorSpy.mockRestore();
    });

    it("should not throw if triggering an event with no registered callbacks", () => {
      expect(() => triggerEvent("connect", "publicKeyABC")).not.toThrow();
      expect(() => triggerEvent("disconnect")).not.toThrow();
      expect(() => triggerEvent("accountChanged", "publicKeyXYZ")).not.toThrow();
      expect(() => triggerEvent("accountChanged", null)).not.toThrow();
    });
  });

  describe("clearAllEventListeners", () => {
    it("should remove all registered callbacks for all event types", () => {
      const connectCallback = jest.fn();
      const disconnectCallback = jest.fn();
      addEventListener("connect", connectCallback);
      addEventListener("disconnect", disconnectCallback);
      clearAllEventListeners();
      triggerEvent("connect", "publicKeyDEF");
      triggerEvent("disconnect");
      expect(connectCallback).not.toHaveBeenCalled();
      expect(disconnectCallback).not.toHaveBeenCalled();
    });
  });
});
