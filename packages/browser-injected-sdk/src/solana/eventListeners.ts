import type { PhantomEventType } from "./types";

export type ConnectCallback = (publicKey: string) => void;
export type DisconnectCallback = () => void;
export type AccountChangedCallback = (publicKey: string) => void;

export type PhantomEventCallback = ConnectCallback | DisconnectCallback | AccountChangedCallback;

const eventCallbacks = new Map<PhantomEventType, Set<PhantomEventCallback>>();

export function addEventListener(event: PhantomEventType, callback: PhantomEventCallback): () => void {
  if (!eventCallbacks.has(event)) {
    eventCallbacks.set(event, new Set());
  }
  eventCallbacks.get(event)!.add(callback);
  return () => {
    removeEventListener(event, callback);
  };
}

export function removeEventListener(event: PhantomEventType, callback: PhantomEventCallback): void {
  if (eventCallbacks.has(event)) {
    eventCallbacks.get(event)!.delete(callback);
    if (eventCallbacks.get(event)!.size === 0) {
      eventCallbacks.delete(event);
    }
  }
}

export function triggerEvent(event: PhantomEventType, ...args: any[]): void {
  if (eventCallbacks.has(event)) {
    eventCallbacks.get(event)!.forEach(cb => {
      if (event === "connect" && args[0] && typeof args[0] === "string") {
        (cb as ConnectCallback)(args[0]);
      } else if (event === "disconnect") {
        (cb as DisconnectCallback)();
      } else if (event === "accountChanged" && args[0] && typeof args[0] === "string") {
        (cb as AccountChangedCallback)(args[0]);
      }
    });
  }
}

export function clearAllEventListeners(): void {
  eventCallbacks.clear();
}
