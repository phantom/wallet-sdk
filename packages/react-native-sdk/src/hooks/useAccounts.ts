import { usePhantom } from "../PhantomContext";

export function useAccounts() {
  const { addresses, isConnected, walletId } = usePhantom();

  return {
    addresses,
    isConnected,
    walletId,
  };
}
