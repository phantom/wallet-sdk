type DisconnectCallback = () => void;

const disconnectCallbacks = new Set<DisconnectCallback>();

export function onDisconnect(callback: DisconnectCallback): () => void {
  disconnectCallbacks.add(callback);
  return () => {
    disconnectCallbacks.delete(callback);
  };
}

export function triggerDisconnectCallbacks(): void {
  disconnectCallbacks.forEach(cb => cb());
}

export function clearAllDisconnectCallbacks(): void {
  disconnectCallbacks.clear();
}
