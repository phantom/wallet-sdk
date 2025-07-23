import { usePhantom } from '../PhantomProvider';
import type { WalletAddress } from '../types';

export function useAccounts(): WalletAddress[] | null {
  const { connection } = usePhantom();

  if (!connection || !connection.connected) {
    return null;
  }

  return connection.addresses;
}