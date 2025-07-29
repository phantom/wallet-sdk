import type { EthereumEventType } from "./types";

export type PhantomEthereumEventCallback = (data: any) => void;

// Store event listeners
const eventListeners: Map<EthereumEventType, Set<PhantomEthereumEventCallback>> = new Map();

/**
 * Add an event listener for Phantom Ethereum events.
 * @param event The event type to listen for.
 * @param callback The callback function to execute when the event is triggered.
 * @returns A function to remove the event listener.
 */
export function addEventListener(event: EthereumEventType, callback: PhantomEthereumEventCallback): () => void {
  if (!eventListeners.has(event)) {
    eventListeners.set(event, new Set());
  }

  const listeners = eventListeners.get(event)!;
  listeners.add(callback);

  // Return a function to remove the listener
  return () => removeEventListener(event, callback);
}

/**
 * Remove an event listener for Phantom Ethereum events.
 * @param event The event type.
 * @param callback The callback function to remove.
 */
export function removeEventListener(event: EthereumEventType, callback: PhantomEthereumEventCallback): void {
  const listeners = eventListeners.get(event);
  if (listeners) {
    listeners.delete(callback);
  }
}

/**
 * Trigger an event and call all registered listeners.
 * @param event The event type to trigger.
 * @param data The data to pass to the event listeners.
 */
export function triggerEvent(event: EthereumEventType, data: any): void {
  const listeners = eventListeners.get(event);
  if (listeners) {
    listeners.forEach(callback => {
      try {
        callback(data);
      } catch (error) {
        console.error(`Error in ${event} event listener:`, error);
      }
    });
  }
}
