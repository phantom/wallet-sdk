import { addEventListener, removeEventListener, triggerEvent } from "./eventListeners";

describe("eventListeners", () => {
  let callback1: jest.Mock;
  let callback2: jest.Mock;

  beforeEach(() => {
    callback1 = jest.fn();
    callback2 = jest.fn();
    jest.clearAllMocks();
  });

  describe("addEventListener", () => {
    it("should add event listener and return removal function", () => {
      const removeListener = addEventListener("connect", callback1);

      expect(typeof removeListener).toBe("function");

      // Trigger event to verify listener was added
      triggerEvent("connect", ["0x742d35Cc6634C0532925a3b8D4C8db86fB5C4A7E"]);
      expect(callback1).toHaveBeenCalledWith(["0x742d35Cc6634C0532925a3b8D4C8db86fB5C4A7E"]);
    });

    it("should add multiple listeners for the same event", () => {
      addEventListener("connect", callback1);
      addEventListener("connect", callback2);

      triggerEvent("connect", ["0x742d35Cc6634C0532925a3b8D4C8db86fB5C4A7E"]);

      expect(callback1).toHaveBeenCalledWith(["0x742d35Cc6634C0532925a3b8D4C8db86fB5C4A7E"]);
      expect(callback2).toHaveBeenCalledWith(["0x742d35Cc6634C0532925a3b8D4C8db86fB5C4A7E"]);
    });

    it("should add listeners for different events", () => {
      addEventListener("connect", callback1);
      addEventListener("disconnect", callback2);

      triggerEvent("connect", ["0x742d35Cc6634C0532925a3b8D4C8db86fB5C4A7E"]);
      triggerEvent("disconnect", []);

      expect(callback1).toHaveBeenCalledWith(["0x742d35Cc6634C0532925a3b8D4C8db86fB5C4A7E"]);
      expect(callback2).toHaveBeenCalledWith([]);
    });
  });

  describe("removeEventListener", () => {
    it("should remove event listener", () => {
      addEventListener("connect", callback1);
      addEventListener("connect", callback2);

      removeEventListener("connect", callback1);

      triggerEvent("connect", ["0x742d35Cc6634C0532925a3b8D4C8db86fB5C4A7E"]);

      expect(callback1).not.toHaveBeenCalled();
      expect(callback2).toHaveBeenCalledWith(["0x742d35Cc6634C0532925a3b8D4C8db86fB5C4A7E"]);
    });

    it("should handle removing non-existent listener", () => {
      // Should not throw error
      expect(() => removeEventListener("connect", callback1)).not.toThrow();
    });

    it("should remove listener using returned function", () => {
      const removeListener = addEventListener("connect", callback1);
      addEventListener("connect", callback2);

      removeListener();

      triggerEvent("connect", ["0x742d35Cc6634C0532925a3b8D4C8db86fB5C4A7E"]);

      expect(callback1).not.toHaveBeenCalled();
      expect(callback2).toHaveBeenCalledWith(["0x742d35Cc6634C0532925a3b8D4C8db86fB5C4A7E"]);
    });
  });

  describe("triggerEvent", () => {
    it("should trigger all listeners for an event", () => {
      addEventListener("accountsChanged", callback1);
      addEventListener("accountsChanged", callback2);

      const accounts = ["0x742d35Cc6634C0532925a3b8D4C8db86fB5C4A7E"];
      triggerEvent("accountsChanged", accounts);

      expect(callback1).toHaveBeenCalledWith(accounts);
      expect(callback2).toHaveBeenCalledWith(accounts);
    });

    it("should handle triggering event with no listeners", () => {
      // Should not throw error
      expect(() => triggerEvent("connect", [])).not.toThrow();
    });

    it("should handle listener errors gracefully", () => {
      const errorCallback = jest.fn(() => {
        throw new Error("Listener error");
      });
      const consoleErrorSpy = jest.spyOn(console, "error").mockImplementation();

      addEventListener("connect", errorCallback);
      addEventListener("connect", callback1);

      triggerEvent("connect", ["0x742d35Cc6634C0532925a3b8D4C8db86fB5C4A7E"]);

      expect(consoleErrorSpy).toHaveBeenCalledWith("Error in connect event listener:", expect.any(Error));
      expect(callback1).toHaveBeenCalledWith(["0x742d35Cc6634C0532925a3b8D4C8db86fB5C4A7E"]);

      consoleErrorSpy.mockRestore();
    });

    it("should trigger events with different data types", () => {
      addEventListener("chainChanged", callback1);

      triggerEvent("chainChanged", "0x89");

      expect(callback1).toHaveBeenCalledWith("0x89");
    });
  });
});
