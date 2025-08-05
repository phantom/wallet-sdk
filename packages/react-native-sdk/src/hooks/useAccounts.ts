import { usePhantom } from '../PhantomProvider';

export function useAccounts() {
  const { addresses, isConnected, walletId, error } = usePhantom();

  return {
    addresses,
    isConnected,
    walletId,
    error,
  };
}