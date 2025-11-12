import { usePhantom } from "../PhantomContext";

export function useAccounts() {
  const { addresses, isConnected } = usePhantom();

  // Return addresses only when connected
  return isConnected ? addresses : null;
}
