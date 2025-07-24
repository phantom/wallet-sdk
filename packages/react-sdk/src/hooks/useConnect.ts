import { useCallback, useState } from 'react';
import { usePhantom } from '../PhantomProvider';

export function useConnect() {
  const context = usePhantom();
  const [isConnecting, setIsConnecting] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const connect = useCallback(async () => {
    if (!context.sdk || !context.isReady) {
      throw new Error('SDK not initialized');
    }

    setIsConnecting(true);
    setError(null);

    try {
      const result = await context.sdk.connect();
      
      // Update context state through re-render
      // The PhantomProvider will detect the connection change
      
      return result;
    } catch (err) {
      setError(err as Error);
      throw err;
    } finally {
      setIsConnecting(false);
    }
  }, [context.sdk, context.isReady]);

  return {
    connect,
    isConnecting,
    error,
  };
}