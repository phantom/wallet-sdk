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

    it("should not throw if triggering an event with no registered callbacks", () => {
      expect(() => triggerEvent("connect", "publicKeyABC")).not.toThrow();
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
