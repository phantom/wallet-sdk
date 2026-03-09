export type EventListenerManagerOptions<EventType extends string> = {
  onError?: (event: EventType, error: unknown) => void;
};

type EventKey<T> = Extract<keyof T, string>;

export class EventListenerManager<Events extends Record<string, (...args: any[]) => void>> {
  private listeners: Map<EventKey<Events>, Set<Events[EventKey<Events>]>> = new Map();
  private onError: (event: EventKey<Events>, error: unknown) => void;

  constructor(options: EventListenerManagerOptions<EventKey<Events>> = {}) {
    this.onError =
      options.onError ??
      ((event, error) => {
        console.error(`Error in ${String(event)} event listener:`, error);
      });
  }

  on<K extends EventKey<Events>>(event: K, callback: Events[K]): () => void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event)?.add(callback);
    return () => {
      this.off(event, callback);
    };
  }

  off<K extends EventKey<Events>>(event: K, callback: Events[K]): void {
    const listeners = this.listeners.get(event);
    if (!listeners) return;
    listeners.delete(callback);
    if (listeners.size === 0) {
      this.listeners.delete(event);
    }
  }

  emit<K extends EventKey<Events>>(event: K, ...args: Parameters<Events[K]>): void {
    const listeners = this.listeners.get(event);
    if (!listeners || listeners.size === 0) return;

    for (const callback of Array.from(listeners)) {
      try {
        callback(...args);
      } catch (error) {
        this.onError(event, error);
      }
    }
  }

  clear(event?: EventKey<Events>): void {
    if (event) {
      this.listeners.delete(event);
      return;
    }
    this.listeners.clear();
  }

  getListenerCount(event: EventKey<Events>): number {
    return this.listeners.get(event)?.size ?? 0;
  }
}
