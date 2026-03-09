import { EventListenerManager } from "./EventListenerManager";

type TestEventMap = {
  connect: (publicKey: string) => void;
  disconnect: () => void;
};

describe("EventListenerManager", () => {
  it("registers listeners and emits events", () => {
    const manager = new EventListenerManager<TestEventMap>();
    const onConnect = jest.fn();

    manager.on("connect", onConnect);
    manager.emit("connect", "pubkey");

    expect(onConnect).toHaveBeenCalledTimes(1);
    expect(onConnect).toHaveBeenCalledWith("pubkey");
  });

  it("returns an unsubscribe function from on()", () => {
    const manager = new EventListenerManager<TestEventMap>();
    const onConnect = jest.fn();

    const unsubscribe = manager.on("connect", onConnect);
    unsubscribe();

    manager.emit("connect", "pubkey");
    expect(onConnect).not.toHaveBeenCalled();
  });

  it("removes listeners and cleans up empty sets", () => {
    const manager = new EventListenerManager<TestEventMap>();
    const onConnect = jest.fn();

    manager.on("connect", onConnect);
    expect(manager.getListenerCount("connect")).toBe(1);

    manager.off("connect", onConnect);
    expect(manager.getListenerCount("connect")).toBe(0);
  });

  it("clears listeners by event or all at once", () => {
    const manager = new EventListenerManager<TestEventMap>();
    const onConnect = jest.fn();
    const onDisconnect = jest.fn();

    manager.on("connect", onConnect);
    manager.on("disconnect", onDisconnect);

    manager.clear("connect");
    expect(manager.getListenerCount("connect")).toBe(0);
    expect(manager.getListenerCount("disconnect")).toBe(1);

    manager.clear();
    expect(manager.getListenerCount("disconnect")).toBe(0);
  });

  it("calls onError and continues when a listener throws", () => {
    const onError = jest.fn();
    const manager = new EventListenerManager<TestEventMap>({ onError });
    const onConnect = jest.fn();
    const onThrow = jest.fn(() => {
      throw new Error("boom");
    });

    manager.on("connect", onThrow);
    manager.on("connect", onConnect);
    manager.emit("connect", "pubkey");

    expect(onError).toHaveBeenCalledTimes(1);
    expect(onConnect).toHaveBeenCalledWith("pubkey");
  });
});
