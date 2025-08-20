import { usePhantom } from "../PhantomProvider";

export function useAccounts() {
  const { addresses, isConnected, walletId } = usePhantom();

  return {
    addresses,
    isConnected,
    walletId,
  };
}
