type ConnectCallback = (publicKey: string) => void;

const connectCallbacks = new Set<ConnectCallback>();

export function onConnect(callback: ConnectCallback): () => void {
  connectCallbacks.add(callback);
  return () => {
    connectCallbacks.delete(callback);
  };
}

export function triggerConnectCallbacks(publicKey: string): void {
  connectCallbacks.forEach(cb => cb(publicKey));
}

export function clearAllConnectCallbacks(): void {
  connectCallbacks.clear();
}
